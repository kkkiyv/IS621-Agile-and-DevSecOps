const express = require("express");
const { prisma } = require("../prisma");
const { signToken } = require("../utils/jwt");
const { validate } = require("../middleware/validate");
const { authDemoLimiter } = require("../middleware/authRateLimit");
const { demoLoginValidation } = require("../validators/auth.validator");
const { syncUser } = require("../controllers/auth.controller");

const router = express.Router();

const DEMO_USERS = {
  TEACHER: "ghimchong96+teacher@gmail.com",
  COUNSELLOR: "ghimchong96+counsellor@gmail.com",
  LEAD_ADMIN: "ghimchong96+lead@gmail.com",
};

function issueSession(user, res) {
  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  return res.json({
    accessToken: token,
    expiresInHours: 8,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

// Clerk sync endpoint
router.post("/sync", syncUser);

// Demo login (JWT-based, for demo/grading purposes)
router.post(
  "/demo-login",
  authDemoLimiter,
  demoLoginValidation,
  validate,
  async (req, res) => {
    const role = req.body.role.trim().toUpperCase();

    try {
      const user = await prisma.user.findUnique({
        where: { email: DEMO_USERS[role] },
      });
      if (!user) {
        return res.status(404).json({
          error: "Demo user not found. Run: npx prisma db seed",
        });
      }
      return issueSession(user, res);
    } catch (e) {
      if (e.message?.includes("JWT_SECRET")) {
        return res.status(500).json({ error: "Server misconfiguration: JWT_SECRET" });
      }
      console.error("Demo login error:", e);
      return res.status(500).json({ error: "Demo login failed" });
    }
  }
);

module.exports = router;