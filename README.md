# Campus Student Website

Web portal for a university campus: schedule, grades, attendance, announcements, events, canteen menu, document requests, and role-based dashboards for **students**, **teachers**, **admins**, and **canteen staff**.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **PostgreSQL** · **Prisma 7**
- **Tailwind CSS 4** · JWT session (httpOnly cookie)

## Quick start

**Requirements:** Node.js 20+, PostgreSQL 14+

```bash
git clone git@github.com:mentisVeritas/campus-student-website.git
cd campus-student-website

make setup   # install, copy .env, migrate, seed
make dev
```

Or with npm directly:

```bash
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo logins (after seed): [docs/development/test-credentials.md](docs/development/test-credentials.md).

Full setup guide: [docs/development/setup.md](docs/development/setup.md).

## Project layout

```
├── src/               # Next.js App Router (pages, API, components)
├── prisma/            # Schema, migrations, seed
├── tools/             # Dev-only maintenance scripts
├── storage/           # Local files (contents not in git)
├── docs/              # Documentation
└── package.json
```

## Scripts

Run via `make <target>` or `npm run <script>`.

| Make | npm | Description |
|------|-----|-------------|
| `make help` | — | List all make targets |
| `make setup` | — | Install, `.env`, migrate, seed |
| `make dev` | `npm run dev` | Development server |
| `make build` | `npm run build` | Production build |
| `make start` | `npm run start` | Run production build |
| `make lint` | `npm run lint` | ESLint |
| `make db-migrate` | `npm run db:migrate` | Apply Prisma migrations (dev) |
| `make db-generate` | `npm run db:generate` | Regenerate Prisma Client |
| `make db-seed` | `npm run db:seed` | Seed demo data |
| `make clean` | — | Remove `.next` cache |

## Documentation

| Topic | Link |
|-------|------|
| Index | [docs/README.md](docs/README.md) |
| Features by role | [docs/FEATURES.md](docs/FEATURES.md) |
| Architecture | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Local setup | [docs/development/setup.md](docs/development/setup.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

## What is not in git

- `node_modules/`, `.next/`, build caches
- `.env` (secrets)
- `storage/*` (uploaded files; directory kept via `.gitkeep`)
- IDE folders (`.idea/`, `.vscode/`)

## License

Private project — see repository owner for distribution terms.
