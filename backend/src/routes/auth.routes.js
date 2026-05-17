const express = require("express");
const bcrypt = require("bcryptjs");
const { prisma } = require("../prisma");
const { signToken } = require("../utils/jwt");

const router = express.Router();

router.post("/login", async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

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
        role: user.role,
      },
    });
  } catch (e) {
    if (e.message?.includes("JWT_SECRET")) {
      return res.status(500).json({ error: "Server misconfiguration: JWT_SECRET" });
    }
    console.error(e);
    return res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
