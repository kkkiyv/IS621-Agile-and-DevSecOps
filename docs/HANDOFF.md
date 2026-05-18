# CaseHub — Team Handoff

**Student Support Portal** — referral intake, counsellor triage, role-based access.  
Use this document for onboarding developers, QA, and DevSecOps review.

---

## 1. What this system does

| Role | Main capabilities |
|------|-------------------|
| **Teacher** | Submit referrals; view **own** referrals and **status only** (no triage/notes) |
| **Counsellor** | View all referrals in queue; filter/sort; **triage** (risk + notes) |
| **Lead / Admin** | View queue (oversight); dashboard/audit — partial in MVP |

**Sprint stories implemented (API + UI):**

| Story | Feature |
|-------|---------|
| CH-001 | Teacher submits referral |
| CH-002 | Teacher “My Referrals” (sanitized payload) |
| CH-003 | Counsellor referral queue (filter, sort, cards) |
| CH-004 | Counsellor triage (risk level + notes) |

---

## 2. Repository structure

```text
IS621-Agile-and-DevSecOps/
├── docs/
│   └── HANDOFF.md              ← this file
├── frontend/                   React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── api/                HTTP client (Bearer JWT)
│   │   ├── context/            AuthProvider (sessionStorage)
│   │   ├── pages/              Login, teacher, counsellor screens
│   │   └── components/         Layout, nav
│   └── vite.config.ts          Proxies /api → localhost:4000
├── backend/                    Node.js + Express
│   ├── prisma/
│   │   ├── schema.prisma       Data model
│   │   ├── migrations/         SQL migrations (versioned)
│   │   └── seed.js             Demo users + sample referrals
│   └── src/
│       ├── routes/             auth, referrals
│       ├── middleware/         JWT, RBAC, validation
│       └── serializers/        Teacher vs counsellor JSON shapes
├── docker-compose.yml          PostgreSQL 16 only
├── .env.example                Root env template
└── README.md                   Quick start
```

**Design references (in repo root):**

- `Agile DevSecOps Group 3.pdf` — Miro flow (roles, statuses, RBAC)
- `Agile and DevSecOps Project (2).pdf` — course spec, backlog, sprints
- Architecture diagram (if present): `assets/casehub-system-architecture.png`

---

## 3. Architecture (for DevSecOps)

```mermaid
flowchart LR
  subgraph clients [Clients]
    T[Teacher browser]
    C[Counsellor browser]
    L[Lead browser]
  end

  subgraph presentation [Presentation Layer]
    FE[React + Vite :5173]
  end

  subgraph api [Business Logic]
    BE[Express + JWT/RBAC :4000]
  end

  subgraph data [Data Layer]
    PR[Prisma ORM]
    PG[(PostgreSQL :5432)]
  end

  T --> FE
  C --> FE
  L --> FE
  FE -->|HTTPS REST /api| BE
  BE --> PR --> PG
```

**Trust boundary:** Browser ↔ API. Frontend stores JWT in `sessionStorage` (demo). API enforces role checks on every protected route.

**Local runtime (default):**

| Service | Port | How started |
|---------|------|-------------|
| Frontend | 5173 | `cd frontend && npm run dev` |
| Backend API | 4000 | `cd backend && npm run dev` |
| PostgreSQL | 5432 | `docker compose up -d` |

**Important:** Postgres in `docker-compose.yml` runs **on each developer’s machine**. There is no shared “team database” unless you deliberately add one (see §8).

---

## 4. Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, React Router |
| Backend | Node.js, Express, express-validator |
| Auth | JWT (`jsonwebtoken`), demo role login + email/password |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 (Docker) |
| Local orchestration | Docker Compose (DB only) |

**Not yet in repo:** GitHub Actions CI/CD, production deploy, Clerk/SSO (removed in favour of demo JWT).

---

## 5. How to run locally (every team member)

### Prerequisites

- [Node.js](https://nodejs.org/) LTS (18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Git

### Steps

```powershell
# 1. Clone and enter repo
git clone <your-github-repo-url>
cd IS621-Agile-and-DevSecOps

# 2. Database
docker compose up -d

# 3. Backend
cd backend
copy .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
# → CaseHub API listening on http://localhost:4000

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Health check

- API: http://localhost:4000/api/health → `{"ok":true,"service":"casehub-api"}`
- App: http://localhost:5173 → role cards (Demo Mode)

### If database errors (500, missing columns)

```powershell
cd backend
npx prisma migrate reset
```

This drops data, reapplies migrations, and re-seeds. **Safe for local demo only.**

---

## 6. Environment variables

Copy `backend/.env.example` → `backend/.env`. **Never commit `.env`.**

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/casehub` | Prisma → Postgres |
| `PORT` | `4000` | API port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowlist |
| `JWT_SECRET` | long random string | Sign/verify tokens |

Frontend uses Vite proxy: `/api` → `http://localhost:4000` (see `frontend/vite.config.ts`). Optional `VITE_API_URL` if calling API without proxy.

---

## 7. Data model (PostgreSQL)

Defined in `backend/prisma/schema.prisma`.

### `User`

| Field | Notes |
|-------|--------|
| `id` | cuid |
| `email` | unique |
| `passwordHash` | bcrypt |
| `name` | display name |
| `role` | `TEACHER` \| `COUNSELLOR` \| `LEAD_ADMIN` |

### `Referral`

| Field | Notes |
|-------|--------|
| `studentName`, `concern`, `description` | from teacher form |
| `status` | `SUBMITTED` → `IN_REVIEW` → `CASE_OPENED` → `CLOSED` |
| `riskLevel` | `LOW` \| `MEDIUM` \| `HIGH` (set at triage) |
| `triageNotes` | counsellor only (max 200 chars in API validation) |
| `submittedById` | FK → User (teacher) |
| `triagedById`, `triagedAt` | FK → User (counsellor), set on triage |

### Migrations

Applied with `npx prisma migrate deploy`. History in `backend/prisma/migrations/`.

---

## 8. API reference

Base URL: `http://localhost:4000/api`  
Protected routes: header `Authorization: Bearer <accessToken>`

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/auth/demo-login` | `{ "role": "TEACHER" \| "COUNSELLOR" \| "LEAD_ADMIN" }` | `{ accessToken, user }` |
| `POST` | `/auth/login` | `{ "email", "password" }` | `{ accessToken, user }` |

### Referrals

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/referrals` | Teacher | CH-001 create referral |
| `GET` | `/referrals/me` | Teacher | CH-002 own list (no triage fields) |
| `GET` | `/referrals/queue` | Counsellor, Lead | CH-003 queue; `?status=`, `?sort=oldest` |
| `GET` | `/referrals/:id` | Counsellor, Lead | Referral detail |
| `PATCH` | `/referrals/:id/triage` | Counsellor | CH-004 `{ riskLevel, triageNotes? }` |

### Demo users (after seed)

Password for email login: `demo123!`

| Email | Name | Role |
|-------|------|------|
| `teacher@casehub.demo` | Sarah Johnson | Teacher |
| `counsellor@casehub.demo` | Michael Chen | Counsellor |
| `lead@casehub.demo` | Jordan Park | Lead |

---

## 9. Frontend routes

| Path | Screen |
|------|--------|
| `/` | Role login (demo JWT) |
| `/teacher/submit` | Submit referral |
| `/teacher/referrals` | My referrals |
| `/counsellor/queue` | Referral queue |
| `/counsellor/referrals/:id` | Detail + triage form |

---

## 10. Security & RBAC (DevSecOps checklist)

### Authentication

- **Demo mode:** role card → `POST /auth/demo-login` → JWT (8h expiry).
- **Optional:** `POST /auth/login` with seeded email/password.
- Token stored in browser `sessionStorage` (not httpOnly cookie — acceptable for demo; revisit for production).

### Authorization (server-side)

Middleware: `authenticate` + `requireRole(...)` on routes.

| Data | Teacher | Counsellor | Lead |
|------|---------|------------|------|
| Own referrals (status view) | Yes | — | — |
| All referrals / triage fields | No | Yes | Yes (view) |
| Triage (`PATCH`) | No | Yes | No |
| Tasks / cases / notes | Not in MVP | Planned | Planned |

### Serializer boundary (CH-002)

`toTeacherReferral()` **strips** `riskLevel`, `triageNotes`, `triagedBy`, etc. Teachers never receive triage data in JSON even if DB contains it.

### Validation

- Referral description: min 20 characters.
- Triage notes: max 200 characters.
- Input validation via `express-validator`.

### Secrets

- `JWT_SECRET` and `DATABASE_URL` only in `.env` (gitignored).
- `.env.example` has placeholders only.

### Recommended DevSecOps follow-ups

- [ ] Add GitHub Actions: `npm ci`, lint, test, `prisma validate`
- [ ] Secret scan (e.g. gitleaks) on push
- [ ] Dependency audit (`npm audit`) in CI
- [ ] Document production TLS termination and cookie-based auth if replacing demo JWT
- [ ] Threat model: STRIDE on referral PII (student names, descriptions)

---

## 11. Giving access to other people

### Developers / QA (recommended for coursework)

1. Share **GitHub repo** + this `HANDOFF.md`.
2. Each person runs **Docker + backend + frontend** locally.
3. Each gets **their own** Postgres via `docker compose` (not your laptop).

### DevSecOps reviewer

Provide:

- This document
- Link to repo + branch (`main`)
- Architecture PNG / Miro PDF (flows + RBAC)
- No access to your personal `.env` or local DB

### Shared demo (optional, not set up yet)

| Approach | Use when |
|----------|----------|
| **Managed Postgres** (Supabase, Neon, Azure) | Team wants one shared DB |
| **Deploy API + FE** (Render, Railway, etc.) | PO/markers need a URL |
| **GitHub Codespaces** | Course requires cloud dev environment |

---

## 12. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `docker_engine` not found | Start Docker Desktop |
| `ECONNREFUSED` on login | Start backend (`npm run dev` in `backend/`) |
| `Request failed (500)` | `cd backend && npx prisma migrate reset` |
| Seed fails (`column does not exist`) | `npx prisma migrate deploy` then `db seed`, or `migrate reset` |
| Port 4000 in use | Stop old backend process, restart |
| Frontend can’t reach API | Ensure backend on 4000; use Vite dev server (proxy) |

---

## 13. Planned / out of scope (MVP)

- Cases, tasks, private notes (Sprint 3–4 in course doc)
- Lead dashboard and audit log UI
- Convert referral → case (`CASE_OPENED` status exists in schema; UI not built)
- Production SSO (Clerk / institutional IdP)
- Full Docker Compose stack (API + FE + DB in one `compose up`)

---

## 14. Contacts & repo

| Item | Value |
|------|--------|
| Project | CaseHub — IS621 Agile & DevSecOps |
| Repo | _Add your GitHub URL here_ |
| Branch | `main` |

_Update the repo URL when pushing to GitHub._
