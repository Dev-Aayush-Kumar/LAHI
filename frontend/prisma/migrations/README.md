## Prisma Migrations (LAHI)

- Baseline: `20260817013000_baseline_schema` captures the schema that already existed in PostgreSQL.
- Additive MVP migration: `20260818160000_commerce_mvp` adds payments, reviews, coupons, returns, notifications, media assets, inventory movements, admin role, and AI job metadata.

Do not rewrite or squash the baseline. New databases should `prisma migrate deploy` from this history.

Legacy loose SQL artifacts were removed from the active migration path to avoid confusion with Prisma Migrate.
