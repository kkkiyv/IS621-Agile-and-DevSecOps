const { Role } = require("@prisma/client");
const { clerkClient } = require("@clerk/express");
const { prisma } = require("../prisma");

const ASSIGNABLE_ROLES = [Role.COUNSELLOR, Role.LEAD_ADMIN];

function clerkConfigured() {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim());
}

function emailFromClerkUser(user) {
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    null
  );
}

function nameFromClerkUser(user, email) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || email;
}

async function fetchClerkStaff() {
  if (!clerkConfigured()) return [];

  try {
    const staff = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await clerkClient.users.getUserList({ limit, offset });
      for (const user of response.data) {
        const role = user.publicMetadata?.role;
        if (!ASSIGNABLE_ROLES.includes(role)) continue;
        const email = emailFromClerkUser(user);
        if (!email) continue;
        staff.push({
          clerkId: user.id,
          email: email.toLowerCase(),
          name: nameFromClerkUser(user, email),
          role,
        });
      }
      if (response.data.length < limit) break;
      offset += limit;
    }

    return staff;
  } catch (err) {
    console.error("[fetchClerkStaff] Clerk unavailable, using DB staff only:", err.message);
    return [];
  }
}

async function syncClerkStaffToDb({ clerkId, email, name, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role) return null;
    if (!existing.clerkId) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { clerkId },
        select: { id: true, name: true, email: true, role: true, clerkId: true },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: { email, name, role, clerkId },
    select: { id: true, name: true, email: true, role: true, clerkId: true },
  });
}

/** Merge demo/seed staff with Clerk users (counsellors + leads). */
async function listCaseOwners() {
  const [dbStaff, clerkStaff] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ASSIGNABLE_ROLES } },
      select: { id: true, name: true, email: true, role: true, clerkId: true },
      orderBy: { name: "asc" },
    }),
    fetchClerkStaff(),
  ]);

  const byEmail = new Map(
    dbStaff.map((user) => [
      user.email.toLowerCase(),
      {
        ...user,
        sources: user.clerkId ? ["db", "clerk"] : ["db"],
      },
    ])
  );

  for (const clerkUser of clerkStaff) {
    const existing = byEmail.get(clerkUser.email);
    if (existing) {
      if (!existing.sources.includes("clerk")) existing.sources.push("clerk");
      continue;
    }

    try {
      const synced = await syncClerkStaffToDb(clerkUser);
      if (synced) {
        byEmail.set(clerkUser.email, { ...synced, sources: ["clerk"] });
      }
    } catch (err) {
      console.error("[listCaseOwners] Failed to sync Clerk user:", clerkUser.email, err.message);
    }
  }

  return [...byEmail.values()]
    .map(({ id, name, email, role, sources }) => ({ id, name, email, role, sources }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function assertCaseOwner(assignedToId) {
  const owner = await prisma.user.findUnique({
    where: { id: assignedToId },
    select: { id: true, role: true },
  });

  if (!owner || !ASSIGNABLE_ROLES.includes(owner.role)) return null;
  return owner;
}

/** @deprecated use listCaseOwners */
async function listCounsellors() {
  const owners = await listCaseOwners();
  return owners.filter((user) => user.role === Role.COUNSELLOR);
}

/** @deprecated use assertCaseOwner */
async function assertCounsellorOwner(assignedToId) {
  return assertCaseOwner(assignedToId);
}

module.exports = {
  listCaseOwners,
  assertCaseOwner,
  listCounsellors,
  assertCounsellorOwner,
};
