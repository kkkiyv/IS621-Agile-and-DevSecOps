const { getAuth } = require("@clerk/express");
const { prisma } = require("../prisma");
const { verifyToken } = require("../utils/jwt");

async function authenticate(req, res, next) {
  const { userId } = getAuth(req);

  try {
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!user) {
        return res.status(401).json({ error: "User not found in system" });
      }
      req.user = user;
      return next();
    }

    // fallback: demo JWT
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") && header.slice(7);
    if (token) {
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!user) {
        return res.status(401).json({ error: "User not found in system" });
      }
      req.user = user;
      return next();
    }

    return res.status(401).json({ error: "Unauthorized" });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}


module.exports = { authenticate };
