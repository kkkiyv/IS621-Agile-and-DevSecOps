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

Open http://localhost:5173 — pick a role (Demo JWT). Password for email login: `demo123!`.

## Demo JWT login

Role cards call `POST /api/auth/demo-login` with `{ "role": "TEACHER" | "COUNSELLOR" | "LEAD_ADMIN" }` and store the JWT in `sessionStorage`.

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
