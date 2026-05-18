# Contributing

## Setup

1. Node.js 20+ (see `.nvmrc`)
2. PostgreSQL 14+
3. Copy `apps/web/.env.example` → `apps/web/.env` and set `DATABASE_URL`, `JWT_SECRET`
4. From repo root: `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`

## Before opening a PR

```bash
npm run lint
npm run build
```

## Conventions

- App code lives under `apps/web/src`
- API routes: `apps/web/src/app/api`
- Prisma schema: `apps/web/prisma/schema.prisma`
- Do not commit `.env`, `node_modules`, `.next`, or `uploads/`
