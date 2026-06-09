const { getAuth } = require("@clerk/express");
const { prisma } = require("../prisma");
const { verifyToken } = require("../utils/jwt");

function isClerkConfigured() {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.CLERK_PUBLISHABLE_KEY?.trim()
  );
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    const bearer =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    // Demo JWT first — works without Clerk middleware on the API.
    if (bearer) {
      try {
        const payload = verifyToken(bearer);
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, role: true },
        });
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        if (err.name !== "JsonWebTokenError" && err.name !== "TokenExpiredError") {
          throw err;
        }
      }
    }

    // Clerk session (requires clerkMiddleware when configured).
    if (isClerkConfigured()) {
      let userId = null;
      try {
        userId = getAuth(req).userId;
      } catch (err) {
        console.error("Clerk getAuth failed:", err.message);
      }

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
    }

    return res.status(401).json({ error: "Unauthorized" });
  } catch (err) {
    console.error("Authenticate error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { authenticate };
