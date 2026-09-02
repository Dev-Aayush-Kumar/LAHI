# Testing

Do not use Google Colab for layers 1–4. Colab is layer 6 only.

Real Florence / SAM2 / DensePose / IDM-VTON inference has **not** been run on a
Tesla T4 in this phase. Passing layers 1–4 does not mean the worker is
GPU-validated.

## Classification

| Label | Meaning |
| --- | --- |
| **LOCAL VERIFIED** | compileall / pytest / mock preflight on this machine |
| **GPU READY** | Real path implemented and wired; requires T4 + weights |
| **GPU VERIFIED** | Actually ran on GPU (not claimed until Layer 6 succeeds) |

## Already passed (this branch, local)

| Check | Result |
| --- | --- |
| Layer 1 `compileall` | LOCAL VERIFIED |
| Layer 2–4 AI pytest | LOCAL VERIFIED |
| Layer 5 preflight on a real T4 | GPU READY (not yet run) |
| Layer 6 real GPU E2E | not GPU VERIFIED |

## Not yet validated

- Real Florence-2 inference
- Real OpenPose/parsing or SAM2 mask inference
- Real DensePose inference
- Real IDM-VTON inference
- Complete real person+garment E2E on Tesla T4
- Live Razorpay/Stripe, production object storage, production deploy

---

## Layer 1 — static / compile validation

From the repo, compile the AI packages only. Do not compile `ai/weights` or
`ai/external` (large binaries / vendor trees).

```bash
cd ai
python -m compileall -q app.py serve.py api runtime models loaders providers pipelines services preprocessing scripts tests
```

## Layer 2 — unit / regression

From `ai/`:

```bash
pytest tests/test_florence_bbox.py tests/test_sam2_bbox_contract.py tests/test_sam2_paths.py tests/test_tryon_synthetic.py tests/test_job_lifecycle.py -q
```

These cover bounding-box contracts, SAM2 path resolution, synthetic try-on
labeling, and job state locking. No GPU, no weight download.

## Layer 3 — API contract

```bash
cd ai
pytest tests/test_api_contract.py tests/test_gpu_readiness.py -q
```

`test_api_contract.py` exercises authenticated `/v1` using `AI_EXECUTION_MODE=mock`.
`test_gpu_readiness.py` checks adapter selection, DensePose/mask requirements,
IDM failure/persist behavior, OOM mapping, and that `scripts.preflight.collect()`
returns diagnostics without loading models.

## Layer 4 — mock pipeline

```bash
cd ai
pytest tests/test_mock_pipeline.py -q
```

Upload person + garment → create try-on job → queue → garment analysis →
segmentation → densepose stage → try-on → synthetic result → `completed`.

Synthetic images are mock fixtures, not customer try-on photos.

Full AI suite (layers 2–4):

```bash
cd ai
pytest
```

## Layer 5 — GPU preflight (no inference)

Does not download multi-GB weights and does not load Florence/SAM2/IDM.

```bash
cd ai
python scripts/preflight.py
python scripts/preflight.py --json
```

| Status / verdict | Meaning |
| --- | --- |
| `READY` / `READY FOR REAL VTO` | GPU mode, CUDA, imports, IDM+DensePose (+ mask path), pose, writable storage |
| `WARNING` | Can start; e.g. mock mode, Florence not yet in HF cache, SAM2 mask fallback |
| `NOT_READY` / `NOT READY` | Do not run layer 6 |

On a laptop without CUDA, leave `AI_EXECUTION_MODE=mock` (default). That is a
**diagnostic** run, not GPU validation. A WARNING about mock mode is expected.

On the T4 worker, set `AI_EXECUTION_MODE=gpu` first. Install detectron2 via
`python scripts/detectron2_bootstrap.py --install` before expecting DensePose to
work. Florence-not-cached is a warning. Missing DensePose/IDM checkpoints or no
CUDA is `NOT_READY`.

## Layer 5.5 — GPU stage validation (Colab, real CUDA)

After preflight is green, validate each real stage before the HTTP E2E harness:

```bash
cd ai
python scripts/gpu_stage_validate.py --person <PERSON_IMAGE> --garment <GARMENT_IMAGE>
```

This is **GPU VERIFIED** only when run on a real T4 and prints
`GPU STAGES VERIFIED` with `synthetic=false` on the full job stage.

## Layer 6 — real GPU E2E

Follow [COLAB.md](COLAB.md). After the tunnel exists:

```bash
cd ai
python scripts/e2e_tryon.py --health-only --base-url https://<TUNNEL_URL> --token "<AI_SERVER_TOKEN>"
python scripts/e2e_tryon.py --base-url https://<TUNNEL_URL> --token "<AI_SERVER_TOKEN>" --person <PERSON_IMAGE> --garment <GARMENT_IMAGE> --timeout 900
```

Success requires `status=completed` and `synthetic=false`.
Do not call this layer **GPU VERIFIED** until that happens.

---

## Frontend (no GPU)

From `frontend/`:

```bash
npm run db:validate
npm test
npm run test:db   # requires DATABASE_URL and applied migrations
npm run db:smoke  # requires DATABASE_URL and seed data
```

`npm test` covers money/tax/shipping, mock payments, local storage, public
error mapping, and the VTO media proxy (browser URLs never include the AI token).
