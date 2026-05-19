import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** GitHub Pages project site: https://<user>.github.io/IS621-Agile-and-DevSecOps/ */
const githubPagesBase = "/IS621-Agile-and-DevSecOps/";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? githubPagesBase : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
