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

## Local Development Setup

### Prerequisites
- Docker Desktop installed and running
- Node.js installed

### Steps

1. Copy the example env file and fill in your Clerk keys:
   ```bash
   cp .env.example backend/.env.local
   ```

2. Start the local Postgres container:
   ```bash
   docker compose up -d
   ```

3. Install dependencies and run migrations:
   ```bash
   cd backend && npm install && npm run prisma:migrate
   ```

4. Start the backend:
   ```bash
   cd backend && npm run dev
   ```

The backend will be running at `http://localhost:4000`
