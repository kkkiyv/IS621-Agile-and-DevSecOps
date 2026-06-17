const { Role } = require("@prisma/client");
const { clerkClient } = require("@clerk/express");
const { prisma } = require("../prisma");

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

async function fetchClerkCounsellors() {
  if (!clerkConfigured()) return [];

  const counsellors = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await clerkClient.users.getUserList({ limit, offset });
    for (const user of response.data) {
      if (user.publicMetadata?.role !== Role.COUNSELLOR) continue;
      const email = emailFromClerkUser(user);
      if (!email) continue;
      counsellors.push({
        clerkId: user.id,
        email: email.toLowerCase(),
        name: nameFromClerkUser(user, email),
      });
    }
    if (response.data.length < limit) break;
    offset += limit;
  }

  return counsellors;
}

async function syncClerkCounsellorToDb({ clerkId, email, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== Role.COUNSELLOR) return null;
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
    data: { email, name, role: Role.COUNSELLOR, clerkId },
    select: { id: true, name: true, email: true, role: true, clerkId: true },
  });
}

/** Merge demo/seed DB counsellors with Clerk counsellors (by email). */
async function listCounsellors() {
  const [dbCounsellors, clerkCounsellors] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.COUNSELLOR },
      select: { id: true, name: true, email: true, clerkId: true },
      orderBy: { name: "asc" },
    }),
    fetchClerkCounsellors(),
  ]);

  const byEmail = new Map(
    dbCounsellors.map((user) => [
      user.email.toLowerCase(),
      { ...user, sources: user.clerkId ? ["db", "clerk"] : ["db"] },
    ])
  );

  for (const clerkUser of clerkCounsellors) {
    const existing = byEmail.get(clerkUser.email);
    if (existing) {
      if (!existing.sources.includes("clerk")) existing.sources.push("clerk");
      continue;
    }

    const synced = await syncClerkCounsellorToDb(clerkUser);
    if (synced) {
      byEmail.set(clerkUser.email, { ...synced, sources: ["clerk"] });
    }
  }

  return [...byEmail.values()]
    .map(({ id, name, email, sources }) => ({ id, name, email, sources }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function assertCounsellorOwner(assignedToId) {
  const owner = await prisma.user.findUnique({
    where: { id: assignedToId },
    select: { id: true, role: true },
  });

  if (!owner || owner.role !== Role.COUNSELLOR) return null;
  return owner;
}

module.exports = { listCounsellors, assertCounsellorOwner };
