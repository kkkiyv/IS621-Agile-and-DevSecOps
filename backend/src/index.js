const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const referralsRoutes = require("./routes/referrals.routes");

const app = express();
const port = Number(process.env.PORT) || 4000;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:5173"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

app.use("/api/auth", authRoutes);
app.use("/api/referrals", referralsRoutes);

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
