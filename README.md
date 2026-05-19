# CaseHub — Student Support Portal

**Team onboarding & DevSecOps:** see [docs/HANDOFF.md](docs/HANDOFF.md).

## Quick start

```bash
# 1. Database
docker compose up -d

# 2. Backend
cd backend
copy .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — sign in with email/password or expand **Demo mode** for role cards. Seeded password: `demo123!`.

## Sign in

- **Email/password:** `POST /api/auth/login` — e.g. `teacher@casehub.demo` / `demo123!`
- **Demo mode (optional):** role cards call `POST /api/auth/demo-login` with `{ "role": "TEACHER" | "COUNSELLOR" | "LEAD_ADMIN" }`

JWT is stored in `sessionStorage`. Auth routes are rate-limited (5 login attempts per 15 minutes per IP).

| Role card | Seed user |
|-----------|-----------|
| Teacher | teacher@casehub.demo (Sarah Johnson) |
| Counsellor | counsellor@casehub.demo |
| Lead | lead@casehub.demo |

## API ↔ screens

| Screen | Story | Endpoint |
|--------|-------|----------|
| Role login | Demo auth | `POST /api/auth/demo-login` |
| Submit Referral | CH-001 | `POST /api/referrals` |
| My Referrals | CH-002 | `GET /api/referrals/me` |
| Counsellor queue | CH-003 | `GET /api/referrals/queue?status=` |
| Triage (API ready) | CH-004 | `PATCH /api/referrals/:id/triage` |

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router
- **Backend:** Node.js, Express, JWT, Prisma
- **DB:** PostgreSQL (Docker Compose)
