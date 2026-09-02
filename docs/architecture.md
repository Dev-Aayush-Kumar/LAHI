# LAHI architecture

LAHI is a consumer fashion e-commerce site. Virtual try-on is a backend
technology layer: a shopper can see themselves in a selected garment before
purchase. Google Colab is only one possible GPU host. It is not a separate
application architecture.

```
                     ┌─────────────────────────────────────┐
 Shopper browser     │  frontend/  Next.js storefront      │
                     │  UI routes, no AI token in JS       │
                     └──────────────┬──────────────────────┘
                                    │ same-origin HTTP
                     ┌──────────────▼──────────────────────┐
                     │  Next.js API / application          │
                     │  /api/*  commerce + VTO orchestration│
                     │  /api/vto/media/[jobId]  media proxy │
                     │  server-only AI_SERVER_TOKEN         │
                     └───┬─────────────┬─────────────┬─────┘
                         │             │             │
              ┌──────────▼───┐  ┌──────▼──────┐  ┌───▼────────────┐
              │ PostgreSQL   │  │ payments    │  │ local/object   │
              │ Prisma       │  │ (mock now)  │  │ storage        │
              └──────────────┘  └─────────────┘  └────────────────┘
                         │
                         │ AI_SERVER_URL + bearer token
                         │ (localhost or https://<TUNNEL_URL>)
                     ┌───▼─────────────────────────────────┐
                     │  ai/  FastAPI /v1                   │
                     │  health (public)                    │
                     │  readiness / capabilities / jobs    │
                     │  assets  (token required)           │
                     └───┬─────────────────────────────────┘
                         │ queue: inline | thread
                     ┌───▼─────────────────────────────────┐
                     │  orchestrator + provider adapters   │
                     │  mock  or  Florence → SAM2 → pose   │
                     │                    → IDM-VTON       │
                     │  sequential load / unload on T4     │
                     └─────────────────────────────────────┘
```

Colab, a VM, RunPod, or a laptop mock worker are interchangeable hosts of this
same `/v1` service. Commerce never imports Florence, SAM2, IDM-VTON, local
weight paths, or Colab notebook URLs.

## Authoritative systems

| Concern | Location |
| --- | --- |
| Customer UI and commerce API | `frontend/` |
| Database | PostgreSQL + `frontend/prisma` |
| AI jobs and inference | `ai/` over `/v1` HTTP |
| Future service split | `backend/` scaffold only |

## Frontend and Next.js API

`frontend/` is both the storefront and the application boundary.

- Prisma is the system of record for users, catalog, cart, orders, and `TryOnJob`.
- Server routes call the AI worker with `AI_SERVER_URL` and `AI_SERVER_TOKEN`.
- Those two variables are server-only. There is no `NEXT_PUBLIC_AI_*`.
- The browser never receives the AI bearer token.
- Try-on pixels are served through `/api/vto/media/[jobId]`, which fetches
  `/v1/assets/{id}/content` on the server.

## Prisma / database

Commerce MVP includes users and sessions, catalog, cart, wishlist, inventory
reservation, checkout, mock payments, returns, reviews, coupons, shipping/tax,
notifications, and an admin area with server-side `ADMIN` checks.

Inventory:

- `quantity` = on-hand
- `reserved` = held for unpaid/open orders
- available = quantity − reserved
- payment success decrements both reserved and on-hand

## AI service and `/v1`

`python serve.py` binds `AI_HOST`/`AI_PORT` (default `0.0.0.0:8000`).

| Endpoint | Auth | Role |
| --- | --- | --- |
| `GET /v1/health` | public | Process up; reports device/CUDA/VRAM |
| `GET /v1/readiness` | token | Weights present, not models already loaded |
| `GET /v1/capabilities` | token | garment / pose / try-on availability |
| `GET /v1/diagnostics` | token | Full model-manager dump |
| `POST /v1/assets` | token | Upload person, garment, or video bytes |
| `GET /v1/assets/{id}/content` | token | Raw bytes (server proxy only) |
| `POST /v1/jobs` | token | `virtual_try_on`, `garment_analysis`, `human_preprocessing` |
| `GET /v1/jobs/{id}` | token | Status, progress, result, error |
| `POST /v1/jobs/{id}/cancel` | token | Terminal states stay locked |

## Remote `AI_SERVER_URL` and token authentication

Any host that serves this contract is valid. After a Colab tunnel exists,
`frontend/.env` becomes:

```
AI_SERVER_URL=https://<TUNNEL_URL>
AI_SERVER_TOKEN=<same secret as the worker>
```

Comparison is constant-time (`hmac.compare_digest`). An empty worker token
rejects all authenticated routes.

## Queue and job model

```
create job → queued → processing → completed | failed | cancelled
```

- `AI_QUEUE_BACKEND=inline` — pytest
- `AI_QUEUE_BACKEND=thread` — local or remote server
- Redis can replace the queue later without changing job handlers

Jobs record request id, operation, assets, provider, status, progress,
timestamps, errors, and duration. Commerce stores a parallel `TryOnJob`.
Cancel cannot move a completed or failed job.

## Asset lifecycle and media proxy

1. Next.js or the E2E harness uploads bytes to `POST /v1/assets`.
2. The worker stores them under `AI_STORAGE_ROOT` (default `ai/var/assets`).
3. The job writes mask and output assets the same way.
4. Result URLs look like `/v1/assets/{id}/content`.
5. The browser is given `/api/vto/media/{jobId}` only.

## Provider / adapter architecture

`providers/registry.py` selects adapters from `AI_EXECUTION_MODE`:

| Mode | Garment | Segmentation | Pose | DensePose | Try-on |
| --- | --- | --- | --- | --- | --- |
| `mock` (default) | mock-garment | mock-sam | mock-pose | mock-pose | mock-tryon (`synthetic=true`) |
| `gpu` | Florence-2 | agnostic mask (preferred) or SAM2 | MediaPipe | DensePose | IDM-VTON (`synthetic=false`) |

GPU mode never substitutes mock output. A synthetic try-on result fails the
job with `unexpected_synthetic`. Missing DensePose / checkpoints / CUDA OOM
fail the job with structured codes (`densepose_weights_missing`, `gpu_oom`, …).

## Orchestration and sequential GPU lifecycle

`pipelines/orchestrator.py` for `virtual_try_on`:

1. Florence garment understanding → unload Florence
2. Mask: OpenPose + human-parsing agnostic mask when assets exist; otherwise SAM2 person mask fallback → unload
3. MediaPipe pose landmarker (diagnostic; not consumed by IDM)
4. DensePose `pose_img` → unload DensePose
5. IDM-VTON generate (prompt embeds, cloth tensor, IP-Adapter garment, mask, DensePose) → unload IDM
6. Persist output asset; `empty_cache` between stages

Planning VRAM on a ~15 GB Tesla T4 is in `models/model_manager.py`. Florence +
DensePose + IDM-VTON are not assumed to stay resident together.

## Models

| Model | How it is obtained | Runtime notes |
| --- | --- | --- |
| Florence-2 | Hugging Face `microsoft/Florence-2-base` | Lazy; first job may download; `attn_implementation="eager"` |
| OpenPose + human parsing | `ckpt/openpose`, `ckpt/humanparsing` under IDM root | Preferred agnostic inpaint mask for IDM |
| SAM2 2.1 tiny | Local `ai/weights/sam2/` + `import sam2` | Mask fallback only when agnostic assets missing |
| Pose | `ai/weights/pose_landmarker_lite.task` | MediaPipe Tasks (diagnostic / preprocessing jobs) |
| DensePose | `ckpt/densepose` + configs + detectron2 | Required `pose_img` for IDM-VTON |
| IDM-VTON | `ai/external/IDM-VTON/src` + `ckpt/` | Canonical loader: `models/idm_loader.py` |

`ai/services/idm_loader.py` is a legacy import path and is not the runtime entry.

## Failure and partial-result semantics

- Florence caption can succeed while detection finds no box → garment
  `processing_status=partial`. SAM2 then segments from a full-image box on the
  **person** image, not from garment geometry.
- A bounding box tagged for a different image raises `CrossImageBoundingBoxError`.
- Missing GPU weights → `ProviderUnavailable` (`idm_weights_missing`, `cuda_required`, …) and job `failed`.
- Uncaught exceptions → job `failed` with a short message.
- Mock jobs complete with `synthetic=true` and are labeled mock fixtures.

## Commerce MVP (non-AI)

Payments (`frontend/lib/payments`) are provider-agnostic. Development uses
`PAYMENT_PROVIDER=mock`. Storage (`frontend/lib/storage`) defaults to local
disk. S3/R2/MinIO and Razorpay/Stripe are named extension points.

## Production migration path

1. Keep Next.js as the commerce boundary until scale requires extraction.
2. Switch `STORAGE_DRIVER` to object storage.
3. Switch `PAYMENT_PROVIDER` to a live provider and verify webhooks.
4. Replace the in-process queue with Redis or equivalent.
5. Point `AI_SERVER_URL` at a dedicated GPU host. Do not special-case Colab.
