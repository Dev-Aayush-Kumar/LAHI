# LAHI Frontend (Next.js + Prisma)

LAHI’s customer storefront and commerce API live here. Virtual try-on is integrated through the AI `/v1` contract.

## Database Foundation

- PostgreSQL is the system of record.
- Prisma schema: `prisma/schema.prisma`
- Prisma migration directory: `prisma/migrations`
- Baseline: `prisma/migrations/20260817013000_baseline_schema`
- Commerce MVP additive migration: `prisma/migrations/20260818160000_commerce_mvp`

The baseline migration represents an already-existing schema.
Do **not** reapply it destructively to an existing database.

## Local Environment

Create `frontend/.env` from `.env.example`. All listed variables are
server-only. `AI_SERVER_TOKEN` must never be exposed as `NEXT_PUBLIC_*`.

```bash
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
JWT_SECRET=<secret>
# Local mock AI, or https://<TUNNEL_URL> after the GPU worker is up.
AI_SERVER_URL=http://127.0.0.1:8000
AI_SERVER_TOKEN=<development-service-token>
PAYMENT_PROVIDER=mock
```

The browser loads try-on images from `/api/vto/media/{jobId}`, never from `/v1/assets/...`.
See the repo README and `docs/COLAB.md` for the remote GPU worker.

## Safe Prisma Workflow

From `frontend/`:

```bash
npm run db:validate
npm run db:generate
npm run db:migrate:status
npx prisma migrate deploy
```

## Seed, smoke, and tests

```bash
npm run seed
npm run db:smoke
npm test
npm run test:db
npm run auth:smoke
```

Optional admin bootstrap during seed:

```bash
ADMIN_BOOTSTRAP_EMAIL=you@lahi.local
ADMIN_BOOTSTRAP_PASSWORD=<secret>
```

## Destructive Command Warning

Do **not** run this casually:

```bash
prisma migrate reset
```

It drops and recreates the database.
