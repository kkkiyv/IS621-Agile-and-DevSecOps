const { getAuth, clerkClient } = require("@clerk/express");
const { prisma } = require("../prisma");

const syncUser = async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Pull email from Clerk's backend — don't trust client-supplied values
    const clerkUser = await clerkClient.users.getUser(userId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return res.status(400).json({ error: "No email on Clerk account" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, clerkId: true },
    });

    if (!user) {
      return res.status(403).json({ error: "User not pre-approved in system" });
    }

    if (user.clerkId && user.clerkId !== userId) {
      return res.status(409).json({ error: "Email already linked to another account" });
    }

    // Atomic write: WHERE clerkId IS NULL prevents double-writes under concurrent requests
    if (!user.clerkId) {
      await prisma.user.updateMany({
        where: { email, clerkId: null },
        data: { clerkId: userId },
      });
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