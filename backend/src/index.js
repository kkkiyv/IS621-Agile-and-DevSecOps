const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const referralsRoutes = require("./routes/referrals.routes");

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontend = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: frontend,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "casehub-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/referrals", referralsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(port, () => {
  console.log(`CaseHub API listening on http://localhost:${port}`);
});
