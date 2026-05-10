# CaseHub

CaseHub is a full-stack project with a backend, frontend, Prisma database layer, and Docker-based local database setup.

## Project Structure

```text
casehub/
├── backend/
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/
│   └── src/
├── .env.example
├── docker-compose.yml
└── README.md
```

## Backend

The backend code is located in:

```text
backend/src/
```

Prisma files are located in:

```text
backend/prisma/
```

## Frontend

The frontend code is located in:

```text
frontend/src/
```

## Environment Variables

Use `.env.example` as a template for local environment variables.

Do not commit real `.env` files to GitHub.

## Database

The project uses PostgreSQL through Docker Compose.

## Backend API (CH-002, CH-003)

Run Postgres (`docker compose up -d`), then from `backend/`:

1. Copy `backend/.env.example` to `backend/.env` (or keep a repo-root `.env`; the server loads repo root then `backend/.env`).
2. `npm install`
3. `npx prisma migrate deploy`
4. `npx prisma db seed`

Start the API: `npm run dev` (default `PORT=4000`).

Seed accounts (password `demo123!`): `teacher@casehub.demo`, `teacher2@casehub.demo`, `counsellor@casehub.demo`.

**Auth**

- `POST /api/auth/login` — `{ "email", "password" }` → `{ accessToken, user }`.

**Stories**

| Story | Role | Endpoint | Behaviour |
|--------|------|-----------|-----------|
| CH-002 | Teacher | `GET /api/referrals/me` + `Authorization: Bearer <JWT>` | Only referrals submitted by this user; **no** triage fields (`triageRiskLevel`, `triageOutcome`). |
| CH-003 | Counsellor | `GET /api/referrals/queue?status=SUBMITTED` (status optional; allowed: `SUBMITTED`, `IN_TRIAGE`, `CASE_OPENED`, `CLOSED`) | All referrals, ordered by newest; includes submitter summary and triage fields. |
