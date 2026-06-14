const path = require("path");

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

const app = require("./app");
const port = Number(process.env.PORT) || 4000;

if (process.env.RENDER || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

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
