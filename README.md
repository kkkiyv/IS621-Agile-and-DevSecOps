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
