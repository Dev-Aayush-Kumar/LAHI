# LAHI

LAHI is a consumer-facing fashion e-commerce platform. Virtual try-on is a differentiating technology layer, not the product itself.

```
Customer browser
        ↓
frontend/   Next.js commerce application and API boundary
        ↓
PostgreSQL  system of record (Prisma)
        ↓
ai/         FastAPI inference service (/v1 contract)
        ↓
GPU worker  Colab, VM, RunPod, AWS, GCP, Azure, or local mock
```

`backend/` is a future separation scaffold only. Do not use it as a second commerce backend.

## Local development

1. Create `frontend/.env` from `frontend/.env.example`.
2. Create `ai/.env` from `ai/.env.example` (`AI_EXECUTION_MODE=mock`).
3. Apply Prisma migrations from `frontend/` with `npx prisma migrate deploy`.
4. `npm run db:generate && npm run seed`
5. `npm run dev` for the storefront.
6. From `ai/`, `uvicorn app:app --reload --port 8000`.

Mock mode runs upload → job → garment analysis → segmentation → try-on → result without a GPU.

## Tests

```bash
# frontend (no GPU)
cd frontend && npm test

# AI contract + mock pipeline (no GPU)
cd ai && pytest
```

Real Florence / SAM2 / IDM-VTON inference is **not** claimed until the dedicated GPU session in `docs/COLAB.md`.

## Documentation

- [Architecture](docs/architecture.md)
- [Testing](docs/TESTING.md)
- [Final GPU / Colab test](docs/COLAB.md)
