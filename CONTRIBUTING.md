# Contributing

Thank you for improving CSW. This document covers local setup and expectations before you open a pull request.

## Setup

1. **Node.js 20+** — see `.nvmrc` (`nvm use`)
2. **PostgreSQL 14+** running locally
3. Copy `.env.example` → `.env` and set `DATABASE_URL`, `JWT_SECRET`
4. From the repository root:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Details: [docs/development/setup.md](docs/development/setup.md).

## Before opening a PR

```bash
npm run lint
npm run build   # requires PostgreSQL to be running
```

CI runs `lint` on every push and pull request.

## Code layout

| Path | Purpose |
|------|---------|
| `src/app/` | Pages and API route handlers |
| `src/components/` | Shared React components |
| `src/lib/` | Auth, Prisma, domain helpers |
| `prisma/` | Schema, migrations, seed |

Architecture notes: [docs/architecture/overview.md](docs/architecture/overview.md).

## Conventions

- Match existing naming, imports, and patterns in nearby files
- API responses: `{ "data": … }` on success, `{ "error": "…" }` on failure
- Do not commit secrets, build artifacts, or local uploads
- Update [docs/FEATURES.md](docs/FEATURES.md) when adding user-visible features or API groups

## Do not commit

- `.env`, credentials, or API keys
- `node_modules/`, `.next/`, `*.tsbuildinfo`
- Files under `storage/` (except `.gitkeep`)
- IDE-specific project files (`.idea/`, `.vscode/` settings with local paths)
