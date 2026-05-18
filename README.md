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

npm run install:web
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env — set DATABASE_URL and JWT_SECRET

npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo logins (after seed): [`docs/development/test-credentials.md`](docs/development/test-credentials.md).

## Repository layout

```
├── apps/web/          # Next.js application (source, API, UI)
│   ├── prisma/        # Schema and migrations
│   └── src/           # App Router pages and components
├── docs/              # Product and development documentation
└── package.json       # convenience scripts (run from root)
```

## Scripts (from repository root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:seed` | Seed demo data |

## Documentation

- [Feature overview](docs/FEATURES.md)
- [Documentation index](docs/README.md)
- [Contributing](CONTRIBUTING.md)

## License

Private project — see repository owner for distribution terms.
