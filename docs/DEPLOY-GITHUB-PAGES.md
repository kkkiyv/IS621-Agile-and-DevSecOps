# Deploy CaseHub for public access (GitHub Pages + API)

GitHub Pages hosts the **React frontend only**. The **API and database** must run on a host such as [Render](https://render.com) (free tier).

**Live site (after setup):**  
https://kkkiyv.github.io/IS621-Agile-and-DevSecOps/

---

## Overview

| Part | Where | URL |
|------|--------|-----|
| Frontend | GitHub Pages | `https://kkkiyv.github.io/IS621-Agile-and-DevSecOps/` |
| Backend API | Render (or similar) | `https://casehub-api.onrender.com` |
| Database | Render Postgres | (internal connection string) |

---

## Step 1 — Deploy the backend (Render)

1. Push this repo to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect repo `IS621-Agile-and-DevSecOps`.
3. Render reads `render.yaml` and creates **casehub-api** + **casehub-db**.
4. When the web service is live, open **Shell** and run:
   ```bash
   npx prisma db seed
   ```
5. Copy the API URL (e.g. `https://casehub-api.onrender.com`).
6. Test: open `https://casehub-api.onrender.com/api/health` → `{"ok":true,...}`.

**Render env (already in `render.yaml`):**

- `FRONTEND_URL` = `https://kkkiyv.github.io,http://localhost:5173` (CORS)
- `JWT_SECRET` = auto-generated
- `DATABASE_URL` = from Postgres

---

## Step 2 — GitHub secret for the frontend build

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret:**
   - Name: `VITE_API_URL`
   - Value: `https://casehub-api.onrender.com` (your Render URL, **no** trailing slash)

---

## Step 3 — Enable GitHub Pages

1. Repo → **Settings** → **Pages**.
2. **Build and deployment** → Source: **GitHub Actions** (not “Deploy from branch”).
3. Push to `main` or run workflow **Deploy GitHub Pages** manually (**Actions** tab).

After success, the site is at:  
**https://kkkiyv.github.io/IS621-Agile-and-DevSecOps/**

---

## Step 4 — Sign in on the public site

Use seeded accounts (password `demo123!`):

| Email | Role |
|-------|------|
| teacher@casehub.demo | Teacher |
| counsellor@casehub.demo | Counsellor |
| lead@casehub.demo | Lead |

Or use **Demo mode** (role cards) on the login page.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page / 404 assets | Ensure workflow uses `GITHUB_PAGES=true`; base path is `/IS621-Agile-and-DevSecOps/` |
| Login fails / network error | Set `VITE_API_URL` secret; redeploy Pages workflow |
| CORS error in browser | On Render, set `FRONTEND_URL` to include `https://kkkiyv.github.io` |
| API 500 / schema errors | Render Shell: `npx prisma migrate deploy` then `npx prisma db seed` |
| Render sleeps (free tier) | First request after idle may take ~30s |

---

## Local vs production

| | Local | GitHub Pages |
|--|--------|----------------|
| Frontend | http://localhost:5173 | https://kkkiyv.github.io/IS621-Agile-and-DevSecOps/ |
| API | proxied to :4000 | `VITE_API_URL` → Render |
| Router | BrowserRouter | HashRouter (`#/…` paths) |

---

## Share with teammates

Send them:

1. **Website:** https://kkkiyv.github.io/IS621-Agile-and-DevSecOps/  
2. **Demo password:** `demo123!`  
3. **HANDOFF.md** for local development

They do **not** need Docker or Node to use the public demo—only a browser.
