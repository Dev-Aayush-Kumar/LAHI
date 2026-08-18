The `backend/` directory is a future service-separation scaffold only.

It is **not** the LAHI commerce backend and must not grow into a second catalog, cart, checkout, or order system.

Authoritative systems:

- Customer application and commerce/API: `frontend/`
- System of record: PostgreSQL via Prisma in `frontend/prisma`
- AI inference service: `ai/`
