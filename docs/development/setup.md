# Local development setup

## Prerequisites

- **Node.js 20+** — use `.nvmrc` (`nvm use`) or any compatible runtime
- **PostgreSQL 14+** — local instance or Docker
- **npm** — comes with Node

## 1. Clone and install

```bash
git clone git@github.com:mentisVeritas/campus-student-website.git
cd campus-student-website

npm install
```

## 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for signing session tokens |

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/csw?schema=public"
JWT_SECRET="change-me-to-a-random-long-secret"
```

**Never commit `.env`.** Only `.env.example` belongs in git.

## 3. Database

Create the database if it does not exist:

```bash
createdb csw
# or via psql: CREATE DATABASE csw;
```

Apply migrations and seed demo data:

```bash
npm run db:migrate
npm run db:seed
```

## 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo logins: [test-credentials.md](./test-credentials.md).

## Common commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:seed` | Reset/seed demo data |

## Troubleshooting

### `Can't reach database server at localhost:5432`

PostgreSQL is not running. Start your local server (Postgres.app, Homebrew `brew services start postgresql`, Docker, etc.) and verify:

```bash
pg_isready -h localhost -p 5432
```

### Build fails with `ECONNREFUSED` during static generation

Some dashboard pages query the database at build time. Ensure PostgreSQL is running and migrations are applied before `npm run build`.

### Port 3000 already in use

Stop the other process or run on another port:

```bash
PORT=3001 npm run dev
```

### After schema changes

```bash
npm run db:generate
npm run db:migrate
```
