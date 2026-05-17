const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET?.trim();

function signToken(payload) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required in environment");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required in environment");
  }
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
