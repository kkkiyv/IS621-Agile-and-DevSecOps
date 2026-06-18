const { getAuth, clerkClient } = require("@clerk/express");
const { prisma } = require("../prisma");

/** Demo/seed emails take precedence over Clerk metadata (course project accounts). */
const DEMO_ROLE_BY_EMAIL = {
  "ghimchong96+teacher@gmail.com": "TEACHER",
  "ghimchong96+teacher2@gmail.com": "TEACHER",
  "kenny2mak+counsellor@gmail.com": "COUNSELLOR",
  "kenny2mak+counsellor2@gmail.com": "COUNSELLOR",
  "ghimchong96+lead@gmail.com": "LEAD_ADMIN",
};

const VALID_ROLES = ["TEACHER", "COUNSELLOR", "LEAD_ADMIN"];

function resolveRole(email, clerkUser) {
  const demoRole = DEMO_ROLE_BY_EMAIL[email.toLowerCase()];
  if (demoRole) return demoRole;

  const clerkRole = clerkUser.publicMetadata?.role;
  return VALID_ROLES.includes(clerkRole) ? clerkRole : null;
}

const syncUser = async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Fast path: user already linked — skip Clerk API call entirely
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    // Slow path: first-time sync — fetch from Clerk to get email + role
    const clerkUser = await clerkClient.users.getUser(userId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return res.status(400).json({ error: "No email on Clerk account" });
    }

    const role = resolveRole(email, clerkUser);
    if (!role) {
      return res.status(403).json({
        error: "No valid role assigned in Clerk. Set publicMetadata.role first.",
      });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, clerkId: true },
    });

    if (!user) {
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email;
      user = await prisma.user.create({
        data: { email, name, role, clerkId: userId },
        select: { id: true, email: true, name: true, role: true, clerkId: true },
      });
    } else {
      if (user.clerkId && user.clerkId !== userId) {
        return res.status(409).json({ error: "Email already linked to another account" });
      }

      const updates = {};
      if (!user.clerkId) updates.clerkId = userId;
      if (role !== user.role) updates.role = role;

      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
          select: { id: true, email: true, name: true, role: true, clerkId: true },
        });
      }
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error("[syncUser]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { syncUser };
