const path = require("path");

// On Render, use dashboard env vars only — never load local .env files.
if (!process.env.RENDER) {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  require("dotenv").config({
    path: path.resolve(__dirname, "../.env.local"),
    override: true,
  });
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
}

if (process.env.RENDER === "true") {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl || dbUrl.includes("localhost")) {
    console.error(
      "DATABASE_URL is missing or points to localhost. In Render, open casehub-api → Environment and link DATABASE_URL to casehub-db."
    );
    process.exit(1);
  }
}

const express = require("express");
const { clerkMiddleware } = require("@clerk/express");
const cors = require("cors");
const { globalApiLimiter } = require("./middleware/authRateLimit");
const authRoutes = require("./routes/auth.routes");
const referralsRoutes = require("./routes/referrals.routes");
const casesRoutes = require("./routes/cases.routes");
const auditRoutes = require("./routes/audit.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();
const port = Number(process.env.PORT) || 4000;

if (process.env.RENDER || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

function toPublicRenderHost(host) {
  const normalized = host.replace(/\/$/, "");
  if (!normalized.includes(".")) {
    return `${normalized}.onrender.com`;
  }
  return normalized;
}

function normalizeOrigin(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      url.hostname = toPublicRenderHost(url.hostname);
      return url.origin;
    } catch {
      return trimmed;
    }
  }
  return `https://${toPublicRenderHost(trimmed)}`;
}

const RENDER_FRONTEND_ORIGINS = {
  "casehub-api": "https://casehub-web.onrender.com",
  "casehub-api-staging": "https://casehub-web-staging.onrender.com",
};

const allowedOrigins = [
  ...new Set(
    [
      ...(process.env.FRONTEND_URL || "http://localhost:5173")
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean),
      RENDER_FRONTEND_ORIGINS[process.env.RENDER_SERVICE_NAME],
      "http://localhost:5173",
    ].filter(Boolean)
  ),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (
        process.env.RENDER === "true" &&
        /^https:\/\/[\w-]+\.onrender\.com$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "casehub-api" });
});

// Dev-only DB probe — disabled on Render/production to avoid info disclosure.
if (process.env.NODE_ENV !== "production" && process.env.RENDER !== "true") {
  app.get("/api/health/db", async (_req, res) => {
    try {
      const { prisma } = require("./prisma");
      const users = await prisma.user.count();
      res.json({ ok: true, users });
    } catch (err) {
      console.error("DB health check failed:", err);
      res.status(500).json({ ok: false, error: "Database unavailable" });
    }
  });
}

app.use("/api", globalApiLimiter);
const clerkConfigured =
  Boolean(process.env.CLERK_SECRET_KEY?.trim()) &&
  Boolean(process.env.CLERK_PUBLISHABLE_KEY?.trim());

if (clerkConfigured) {
  app.use(clerkMiddleware());
} else {
  console.warn(
    "Clerk not configured on API (set CLERK_SECRET_KEY + CLERK_PUBLISHABLE_KEY). Demo mode works; Clerk sign-in will not."
  );
}
app.use("/api/auth", authRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const code = err.code;
  if (code === "P2022" || code === "P2021") {
    return res.status(500).json({
      error:
        "Database schema is out of date. In backend folder run: npx prisma migrate reset",
    });
  }
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

async function start() {
  if (process.env.RENDER === "true") {
    try {
      const { seedDatabase } = require("../prisma/seed");
      await seedDatabase();
    } catch (err) {
      console.error("Startup seed failed:", err);
    }
  }

  const server = app.listen(port, () => {
    console.log(`CaseHub API listening on http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the other Node process, then run npm run dev again.`
      );
      console.error("PowerShell: netstat -ano | findstr :4000  then  taskkill /PID <pid> /F");
      process.exit(1);
    }
    throw err;
  });
}

start();
