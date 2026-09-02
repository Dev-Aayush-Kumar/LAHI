# LAHI

LAHI is a consumer fashion e-commerce platform. Virtual try-on is a
differentiating backend capability, not the product itself.

```
Customer browser
        ↓
frontend/     Next.js commerce app + /api  (Prisma / PostgreSQL)
        ↓  AI_SERVER_URL + server-only token
ai/           FastAPI /v1 inference service
        ↓
GPU host      local mock, Colab T4, or any machine that serves /v1
```

`backend/` is a future split scaffold only. Do not grow a second commerce API there.

Colab is a temporary GPU host. It does not change the architecture.
Details: [docs/architecture.md](docs/architecture.md).

## Local mock (no GPU)

1. Copy `frontend/.env.example` → `frontend/.env`.
2. Copy `ai/.env.example` → `ai/.env` with `AI_EXECUTION_MODE=mock`.
3. From `frontend/`: apply Prisma migrations, `npm run db:generate`, `npm run seed`, `npm run dev`.
4. From `ai/`: `pip install -r requirements.txt` then `python serve.py`.

`ai/requirements.txt` does **not** install torch. That is intentional so a later
Colab install cannot replace CUDA PyTorch with a CPU wheel.

Mock mode runs upload → job → garment analysis → segmentation → try-on →
synthetic result.

## Remote GPU worker

1. Follow [docs/COLAB.md](docs/COLAB.md) on a Tesla T4: keep runtime torch,
   install `requirements.txt` + `requirements-gpu.txt`, install SAM2 with
   `--no-deps`, place weights, run `python scripts/preflight.py`, start
   `python serve.py`, open an HTTPS tunnel.
2. Point `frontend/.env` at `AI_SERVER_URL=https://<TUNNEL_URL>` with the
   **same** `AI_SERVER_TOKEN`. Restart Next.js.
3. Browsers load results from `/api/vto/media/{jobId}` only.

## Tests

```bash
cd frontend && npm test
cd ai && python -m compileall -q app.py serve.py api runtime models loaders providers pipelines services preprocessing scripts tests
cd ai && pytest
cd ai && python scripts/preflight.py    # diagnostic; mock mode needs no GPU
```

AI pytest: **47 passed** on this branch (layers 2–4, LOCAL VERIFIED). Real GPU
inference has **not** been run (GPU READY, not GPU VERIFIED). See
[docs/TESTING.md](docs/TESTING.md).

## First real GPU E2E

Not done yet. After the T4 worker is up:

```bash
cd ai
python scripts/e2e_tryon.py --health-only --base-url https://<TUNNEL_URL> --token "<AI_SERVER_TOKEN>"
python scripts/e2e_tryon.py --base-url https://<TUNNEL_URL> --token "<AI_SERVER_TOKEN>" --person <PERSON_IMAGE> --garment <GARMENT_IMAGE>
```

## Model weights (not in git)

| Asset | Location |
| --- | --- |
| Florence-2 | Hugging Face cache (`microsoft/Florence-2-base`); first GPU job may download |
| SAM2 | `ai/weights/sam2/checkpoints/sam2.1_hiera_tiny.pt` + yaml under `configs/` (mask fallback) |
| Pose | `ai/weights/pose_landmarker_lite.task` |
| IDM-VTON | `ai/external/IDM-VTON/src` + `ckpt/` diffusion subfolders |
| DensePose | `ckpt/densepose/model_final_162be9.pkl` + `configs/densepose_rcnn_R_50_FPN_s1x.yaml` |
| OpenPose / parsing | `ckpt/openpose/`, `ckpt/humanparsing/` (preferred agnostic masks) |

## Secrets that must never be committed

- `frontend/.env` — `DATABASE_URL`, `JWT_SECRET`, `AI_SERVER_TOKEN`, payment secrets
- `ai/.env` — `AI_SERVER_TOKEN`
- Hugging Face tokens, tunnel credentials, model zips

`AI_SERVER_TOKEN` is server-only. Never `NEXT_PUBLIC_AI_SERVER_TOKEN`.

## Documentation

- [Architecture](docs/architecture.md)
- [Testing layers](docs/TESTING.md)
- [Colab T4 runbook](docs/COLAB.md)
- Env templates: `frontend/.env.example`, `ai/.env.example`
