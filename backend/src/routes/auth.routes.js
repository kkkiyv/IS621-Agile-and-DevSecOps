const express = require("express");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");
const { signToken } = require("../utils/jwt");
const { validate } = require("../middleware/validate");
const {
  authLoginLimiter,
  authDemoLimiter,
} = require("../middleware/authRateLimit");
const {
  loginValidation,
  demoLoginValidation,
} = require("../validators/auth.validator");

const router = express.Router();

const DEMO_USERS = {
  TEACHER: "teacher@casehub.demo",
  COUNSELLOR: "counsellor@casehub.demo",
  LEAD_ADMIN: "lead@casehub.demo",
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

/** Demo role cards on login screen */
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
    console.error(e);
    return res.status(500).json({ error: "Demo login failed" });
  }
  }
);

router.post("/login", authLoginLimiter, loginValidation, validate, async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return issueSession(user, res);
  } catch (e) {
    if (e.message?.includes("JWT_SECRET")) {
      return res.status(500).json({ error: "Server misconfiguration: JWT_SECRET" });
    }
    console.error(e);
    return res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
