const rateLimit = require("express-rate-limit");

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const authDemoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many demo sign-in attempts. Please try again later.",
  },
});

const authSyncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many auth sync attempts. Please try again later.",
  },
});

const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
  skip: (req) => req.path === "/health" || req.path === "/health/db",
});

module.exports = {
  authLoginLimiter,
  authDemoLimiter,
  authSyncLimiter,
  globalApiLimiter,
};
