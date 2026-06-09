const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({
  path: path.resolve(__dirname, "../.env.local"),
  override: true,
});
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const express = require("express");
const { clerkMiddleware } = require("@clerk/express");
const cors = require("cors");
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
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "casehub-api" });
});
app.use(clerkMiddleware());
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
