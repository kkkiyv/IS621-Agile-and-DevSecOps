# Deploy CaseHub on Render (staging + production)

Everything runs on Render: **Postgres**, **API**, and **static website** — twice (staging + production).

| Environment | Git branch | Website | API | Database |
|-------------|------------|---------|-----|----------|
| **Staging** | `staging` | `casehub-web-staging` | `casehub-api-staging` | `casehub-db-staging` |
| **Production** | `main` | `casehub-web` | `casehub-api` | `casehub-db` |

URLs look like:
- `https://casehub-web-staging.onrender.com`
- `https://casehub-api-staging.onrender.com`
- `https://casehub-web.onrender.com`
- `https://casehub-api.onrender.com`

---

## Before you start

- [ ] GitHub repo is up to date
- [ ] Render account: https://dashboard.render.com
- [ ] Clerk keys ready (Dashboard → API Keys)
- [ ] **Free tier note:** Render allows **1 free Postgres** per account. If Blueprint fails on the second database, see [Troubleshooting](#troubleshooting) below.

---

## Step 1 — Create the `staging` branch

Staging services deploy from `staging`, production from `main`.

```bash
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

Merge feature work into `staging` first, test there, then merge `staging` → `main` for production.

---

## Step 2 — Push `render.yaml`

Ensure `render.yaml` is on `main` (and merge into `staging`):

```bash
git add render.yaml docs/DEPLOY-RENDER.md
git commit -m "Add Render staging + production blueprint"
git push origin main
git checkout staging && git merge main && git push origin staging
```

---

## Step 3 — Launch the Blueprint on Render

1. Render Dashboard → **New** → **Blueprint**
2. Connect GitHub repo `IS621-Agile-and-DevSecOps`
3. Render reads `render.yaml` and proposes **6 resources**:
   - 2 × Postgres
   - 2 × Node API
   - 2 × Static site (frontend)
4. Click **Apply**

Wait until all services show **Live** (first deploy can take 5–10 minutes).

---

## Step 4 — Set secrets Render cannot generate

For **each** service below, open **Environment** in the Render dashboard.

### API services (`casehub-api-staging` + `casehub-api`)

| Variable | Value |
|----------|--------|
| `CLERK_SECRET_KEY` | From Clerk dashboard (secret key) |

### Static sites (`casehub-web-staging` + `casehub-web`)

| Variable | Value |
|----------|--------|
| `VITE_CLERK_PUBLISHABLE_KEY` | From Clerk dashboard (publishable key) |

Set `VITE_API_URL` to the **public** API URL (e.g. `https://casehub-api.onrender.com`). Do **not** use Blueprint `fromService: property: host` — that is the private network hostname (`casehub-api`), which breaks browser requests.

### Fix CORS after first deploy (both APIs)

Set `FRONTEND_URL` on each API to the **public** static site URL. Verify each API has:

```
FRONTEND_URL=https://casehub-web-staging.onrender.com,http://localhost:5173
```

(or production: `https://casehub-web.onrender.com,http://localhost:5173`)

Render may set hostname only — the API normalizes to `https://` automatically. Include `http://localhost:5173` for local dev.

Click **Save** → Render redeploys the API.

---

## Step 5 — Seed both databases

For **each** API service, open **Shell** and run:

```bash
npx prisma db seed
```

Do this for:
1. `casehub-api-staging`
2. `casehub-api` (production)

---

## Step 6 — Smoke test

### Staging

| Test | URL |
|------|-----|
| API health | `https://casehub-api-staging.onrender.com/api/health` |
| Website | `https://casehub-web-staging.onrender.com` |
| Demo login | Open site → Demo mode → pick a role |

### Production

| Test | URL |
|------|-----|
| API health | `https://casehub-api.onrender.com/api/health` |
| Website | `https://casehub-web.onrender.com` |
| Demo login | Same as staging |

---

## Step 7 — Day-to-day workflow

```
feature branch → PR → merge to staging
                         ↓
              Test on casehub-web-staging.onrender.com
                         ↓
              merge staging → main
                         ↓
              Auto-deploy production on Render
```

| Action | What redeploys |
|--------|----------------|
| Push to `staging` | Staging API + staging website |
| Push to `main` | Production API + production website |

---

## Step 8 — Clerk production URLs

In Clerk Dashboard → **Domains** / **Allowed origins**, add:

- `https://casehub-web-staging.onrender.com`
- `https://casehub-web.onrender.com`

---

## Architecture

```
casehub-web-staging  ──VITE_API_URL──►  casehub-api-staging  ──►  casehub-db-staging
casehub-web          ──VITE_API_URL──►  casehub-api          ──►  casehub-db
```

Frontend uses **HashRouter** (`/#/…`) — no SPA rewrite rules needed on Render static sites.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blueprint: `no such plan free for service type web` on static sites | Remove `plan: free` from `runtime: static` services — static sites are free by default and do not accept a plan field. |
| Blueprint fails: 2nd Postgres | Free tier = 1 DB. Use one Postgres; point staging API to a `casehub_staging` database via manual `DATABASE_URL`, or upgrade plan. |
| CORS error in browser | Set `FRONTEND_URL` on API to full static site URL + localhost |
| Demo login: **Failed to fetch** | `VITE_API_URL` must be full public URL (`https://casehub-api.onrender.com`), not internal host (`casehub-api`). Update env var → **Manual Deploy** static site (clear build cache). |
| Login / API network error | Check `VITE_API_URL` on static site; redeploy frontend |
| API 500 / schema errors | API Shell: `npx prisma migrate deploy` then `npx prisma db seed` |
| Blank website | Check static site build logs; ensure `npm run build` succeeds |
| Slow first load (free tier) | Services sleep after ~15 min idle; first request takes ~30s |
| Clerk sign-in fails | Set `CLERK_SECRET_KEY` on API + `VITE_CLERK_PUBLISHABLE_KEY` on static site; add Render URLs in Clerk |

---

## Submission checklist (CH-021)

- [ ] Staging URL works end-to-end
- [ ] Production URL works end-to-end
- [ ] Demo mode: Teacher, Counsellor, Lead
- [ ] Lead dashboard + audit logs on production
- [ ] URLs documented in README / report
- [ ] Teammates can access without local setup

---

## Local development (unchanged)

```bash
docker compose up -d
cd backend && npm run dev
cd frontend && npm run dev
```

Local: http://localhost:5173 (API proxied to :4000)
