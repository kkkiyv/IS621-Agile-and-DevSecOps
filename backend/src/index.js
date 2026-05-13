require("dotenv").config({ path: ".env.local" });
const express = require("express");
const { clerkMiddleware } = require("@clerk/express");

const app = express();

app.use(express.json());
app.use(clerkMiddleware());

// Routes
app.use("/api/referrals", require("./routes/referral"));
app.use("/api/referrals", require("./routes/triage"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "CaseHub API is running" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
