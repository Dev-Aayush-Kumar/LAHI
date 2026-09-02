# Remote GPU worker runbook (Colab Tesla T4)

Colab is a temporary GPU host. It is not a special application architecture.
The commerce app only needs `AI_SERVER_URL` + `AI_SERVER_TOKEN` and talks to
the same FastAPI `/v1` contract used locally.

Do not use Colab for unit tests. Use it for the first real person+garment E2E
after local compileall and AI pytest have passed.

Values you must supply:

| Placeholder | Meaning |
| --- | --- |
| `<AI_SERVER_TOKEN>` | Long random secret. Same value in Colab env and `frontend/.env`. Never commit. Never `NEXT_PUBLIC_`. |
| `<TUNNEL_URL>` | Public `https://...` origin printed by the tunnel. No trailing slash. |
| `<MODEL_WEIGHT_LOCATION>` | Directory on the runtime (Drive, `/content/...`, or uploaded zip) that already holds IDM-VTON sources/checkpoints you obtained yourself. |
| `<PERSON_IMAGE>` / `<GARMENT_IMAGE>` | Real JPEG/PNG paths for the first E2E. |
| `<REPO_URL>` | This Git remote, default `https://github.com/Dev-Aayush-Kumar/LAHI.git`. |

Large weights are not in git. Do not download them during `python serve.py` startup.

Colab snippets use IPython (`%cd`, `!cmd`, and sometimes `import os`). Paste them
into Colab **code** cells, not a raw bash prompt.

---

## A. Fresh Colab T4 runtime

1. Open a new Colab notebook.
2. **Runtime → Change runtime type → GPU → Tesla T4**.
3. **Runtime → Connect**.
4. Confirm the runtime Python is 3.10–3.12 (`!python --version`). Do not use a CPU runtime.

---

## B. GPU verification

Run this before installing anything. Stop if CUDA is false.

```python
!nvidia-smi
import torch, torchvision
print("torch", torch.__version__)
print("torchvision", torchvision.__version__)
print("cuda", torch.cuda.is_available(), torch.version.cuda)
print("device", torch.cuda.current_device() if torch.cuda.is_available() else None)
print("name", torch.cuda.get_device_name(0) if torch.cuda.is_available() else None)
print("vram_mb", round(torch.cuda.get_device_properties(0).total_memory / 1024 / 1024) if torch.cuda.is_available() else None)
assert torch.cuda.is_available(), "This runtime has no CUDA torch. Do not continue."
```

Expected: `True`, a Tesla T4, about 15000 MB. Keep this torch. Do not `pip install torch`.

---

## C. Clone the correct branch

```bash
%cd /content
!git clone -b lahi-mvp --depth 1 <REPO_URL>
%cd /content/LAHI/ai
!git rev-parse --abbrev-ref HEAD
```

Must print `lahi-mvp`. Do not clone `main` or `idm-vton-integration` for this E2E.

If you already have a Drive copy of the repo, `%cd` to that `ai/` directory instead of cloning.

---

## D. Python / environment assumptions

| Item | Assumption |
| --- | --- |
| Python | 3.10–3.12 from the Colab runtime |
| torch / torchvision | Already CUDA-enabled on the T4 runtime |
| Working directory for install | `/content/LAHI/ai` |
| Bind | `0.0.0.0:8000` |
| Execution | `AI_EXECUTION_MODE=gpu` |
| Queue | `AI_QUEUE_BACKEND=thread` |
| flash-attn | Must not be installed |

---

## E. Dependency installation

From `/content/LAHI/ai`. These two files do **not** install torch.

```bash
%cd /content/LAHI/ai
!python -c "import torch; assert torch.cuda.is_available()"
!pip install -r requirements.txt
!pip install -r requirements-gpu.txt
!python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

If the last line is no longer CUDA `True`, the environment is broken. Do **not** “fix” it with `pip install torch`. Recreate the runtime.

Do **not** run the upstream IDM-VTON `requirements.txt`. It pins its own torch.

---

## F. SAM2 installation

`sam2` is not on our requirements files because a normal `pip install` of
[facebookresearch/sam2](https://github.com/facebookresearch/sam2) declares
`torch>=2.5.1` and will replace Colab’s CUDA torch with a CPU wheel.

```python
%cd /content
!git clone --depth 1 https://github.com/facebookresearch/sam2.git
%cd /content/sam2
import os
os.environ["SAM2_BUILD_CUDA"] = "0"
!pip install --no-deps -e .
%cd /content/LAHI/ai
!python -c "from sam2.build_sam import build_sam2; print('sam2 import ok')"
!python -c "import torch; assert torch.cuda.is_available(); print('torch still CUDA', torch.__version__)"
```

`hydra-core`, `iopath`, and `tqdm` already came from `requirements-gpu.txt`.

---

## F2. Detectron2 for DensePose (required)

The vendored `gradio_demo/detectron2/_C*.so` is built for an old Python and
**must not** be used on Colab. Install detectron2 against the runtime torch
instead:

```python
%cd /content/LAHI/ai
!python scripts/detectron2_bootstrap.py
# Copy the printed pip line, or:
!python scripts/detectron2_bootstrap.py --install
!python -c "import detectron2; print('detectron2', detectron2.__version__)"
!python -c "import torch; assert torch.cuda.is_available(); print('torch still CUDA', torch.__version__)"
```

Also ensure the upstream IDM tree includes `configs/`, `preprocess/`, and
`gradio_demo/` (DensePose Python package lives under `gradio_demo/densepose/`).
Copy them from the official IDM-VTON repo if your weight bundle omitted them.

---

## G. IDM-VTON source and checkpoint placement

Not in git. Our loader expects this layout (or set `AI_IDM_ROOT` to `<MODEL_WEIGHT_LOCATION>` if it already matches):

```
ai/external/IDM-VTON/
  src/unet_hacked_tryon.py
  src/unet_hacked_garmnet.py
  src/tryon_pipeline.py
  configs/densepose_rcnn_R_50_FPN_s1x.yaml
  gradio_demo/          # detectron2 + densepose + utils_mask (Linux)
  preprocess/           # openpose + humanparsing
  ckpt/scheduler/
  ckpt/vae/
  ckpt/unet/
  ckpt/image_encoder/
  ckpt/unet_encoder/
  ckpt/text_encoder/
  ckpt/text_encoder_2/
  ckpt/tokenizer/
  ckpt/tokenizer_2/
  ckpt/densepose/model_final_162be9.pkl
  ckpt/openpose/ckpts/body_pose_model.pth
  ckpt/humanparsing/parsing_atr.onnx
  ckpt/humanparsing/parsing_lip.onnx
```

Sources come from the official IDM-VTON repository. Diffusion checkpoints come
from Hugging Face `yisol/IDM-VTON`. DensePose / OpenPose / parsing weights are
part of the same upstream release (or the Gradio demo bundle)—**not** downloaded
by `python serve.py`.

```bash
# Sources (code only)
%cd /content
!git clone --depth 1 https://github.com/yisol/IDM-VTON.git /content/IDM-VTON-src
!mkdir -p /content/LAHI/ai/external/IDM-VTON/src
!cp /content/IDM-VTON-src/src/unet_hacked_tryon.py /content/LAHI/ai/external/IDM-VTON/src/
!cp /content/IDM-VTON-src/src/unet_hacked_garmnet.py /content/LAHI/ai/external/IDM-VTON/src/
!cp /content/IDM-VTON-src/src/tryon_pipeline.py /content/LAHI/ai/external/IDM-VTON/src/
# Also copy configs/, preprocess/, gradio_demo/ from the upstream tree if missing.

# Checkpoints (multi-GB). Use a Drive copy if you already downloaded them.
# huggingface-cli is available after requirements-gpu.txt.
!huggingface-cli download yisol/IDM-VTON --local-dir /content/LAHI/ai/external/IDM-VTON/ckpt
```

DensePose is **required** for real inference (`pose_img`). OpenPose + parsing
are preferred for agnostic clothing masks; SAM2 is only a fallback.

If the Hugging Face snapshot already contains those subfolders at the repo
root, the `--local-dir .../ckpt` command is correct. If you instead unpacked a
zip at `<MODEL_WEIGHT_LOCATION>`, point the worker at it:

```bash
export AI_IDM_ROOT='<MODEL_WEIGHT_LOCATION>'
```

Do not `pip install -r /content/IDM-VTON-src/requirements.txt`.

Real inference call (Gradio-compatible) uses:

- person RGB 768×1024
- garment RGB 768×1024 (+ IP-Adapter image)
- agnostic/inpaint mask 768×1024
- DensePose `pose_img` tensor
- `encode_prompt` for person + cloth captions
- `strength=1.0`, fp16 on CUDA

Sequential T4 lifecycle: Florence → mask → DensePose → IDM (unload between stages).
---

## H. Florence model / cache behavior

Florence-2 is **not** a local file under `ai/weights`. The worker uses
`AI_FLORENCE_MODEL` (default `microsoft/Florence-2-base`) via Hugging Face.

- Missing cache is a preflight **WARNING**, not a broken worker.
- The first garment-analysis stage may download the model into `HF_HOME`
  (default `~/.cache/huggingface`).
- Startup (`python serve.py`) does not download it.
- Optional: `export HF_HOME=/content/hf-cache` so the download lands on the
  runtime disk you control. Mount Drive there if you want reuse across sessions.

---

## I. Pose model placement

MediaPipe pose landmarker weights are not in git.

```bash
!mkdir -p /content/LAHI/ai/weights
!wget -O /content/LAHI/ai/weights/pose_landmarker_lite.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
```

---

## J. SAM2 weights

```bash
!mkdir -p /content/LAHI/ai/weights/sam2/checkpoints /content/LAHI/ai/weights/sam2/configs/sam2.1
!wget -O /content/LAHI/ai/weights/sam2/checkpoints/sam2.1_hiera_tiny.pt \
  https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt
!cp /content/sam2/sam2/configs/sam2.1/sam2.1_hiera_t.yaml \
  /content/LAHI/ai/weights/sam2/configs/sam2.1/sam2.1_hiera_t.yaml
```

If the yaml path differs in a newer SAM2 checkout, copy whichever
`sam2.1_hiera_t.yaml` exists into either:

- `ai/weights/sam2/configs/sam2.1/sam2.1_hiera_t.yaml` (preferred), or
- `ai/weights/sam2/configs/sam2.1_hiera_t.yaml`

---

## K. Environment variables

In the same notebook session, before preflight and serve:

```python
import os
os.environ["AI_SERVER_TOKEN"] = "<AI_SERVER_TOKEN>"
os.environ["AI_EXECUTION_MODE"] = "gpu"
os.environ["AI_QUEUE_BACKEND"] = "thread"
os.environ["AI_HOST"] = "0.0.0.0"
os.environ["AI_PORT"] = "8000"
os.environ["AI_ALLOWED_ORIGINS"] = "*"
# Optional:
# os.environ["AI_IDM_ROOT"] = "<MODEL_WEIGHT_LOCATION>"
# os.environ["HF_HOME"] = "/content/hf-cache"
# os.environ["AI_STORAGE_ROOT"] = "/content/lahi-assets"
# os.environ["AI_VRAM_BUDGET_MB"] = "15000"
```

`ai/.env` is loaded only for keys that are not already in the process
environment, so Colab `os.environ` wins.

---

## L. Preflight

```bash
%cd /content/LAHI/ai
!python scripts/preflight.py
```

Statuses / verdict:

| Status | Verdict | Meaning | Exit |
| --- | --- | --- | --- |
| `READY` | `READY FOR REAL VTO` | GPU mode, CUDA, packages, IDM+DensePose (+ mask path), pose, writable storage | 0 |
| `WARNING` | often still `READY FOR REAL VTO` | Service can start; read notes (e.g. Florence not cached, SAM2 mask fallback) | 0 |
| `NOT_READY` | `NOT READY` | Do not start the first E2E | 1 |

Do not claim readiness from imports alone. Missing DensePose or IDM ckpts is a blocker.

Florence-not-cached is a warning. Missing SAM2/IDM/pose files or no CUDA in
GPU mode is `NOT_READY`.

Diagnostic without a GPU (laptop): leave `AI_EXECUTION_MODE=mock` and run the
same command. That is not GPU validation.

---

## M. FastAPI startup

Does not load Florence, SAM2, or IDM-VTON.

```python
import os, subprocess, time
os.chdir("/content/LAHI/ai")
server = subprocess.Popen(["python", "serve.py"], cwd="/content/LAHI/ai")
time.sleep(4)
print("pid", server.pid)
```

Or in a dedicated cell that you leave running:

```bash
%cd /content/LAHI/ai
!python serve.py
```

---

## N. HTTPS tunnel

The storefront and the laptop harness need a public HTTPS origin.

```bash
# Separate cell while serve.py is running
!wget -q -O /content/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x /content/cloudflared
!/content/cloudflared tunnel --url http://127.0.0.1:8000
```

Copy the printed `https://<something>.trycloudflare.com` value. That is
`<TUNNEL_URL>`. Do not include a path or trailing slash.

ngrok also works if you already have an ngrok token; it is not required.

---

## O. Health / readiness / capabilities

From Colab (localhost) or from your laptop (tunnel):

```bash
curl -s http://127.0.0.1:8000/v1/health
curl -s -H "Authorization: Bearer <AI_SERVER_TOKEN>" http://127.0.0.1:8000/v1/readiness
curl -s -H "Authorization: Bearer <AI_SERVER_TOKEN>" http://127.0.0.1:8000/v1/capabilities
```

From the laptop after the tunnel is up:

```bash
cd ai
python scripts/e2e_tryon.py --health-only --base-url https://<TUNNEL_URL> --token "<AI_SERVER_TOKEN>"
```

`/v1/health` is public. Readiness, capabilities, jobs, and assets require the bearer token.

Readiness means weights are present, not that models are already loaded.

---

## O2. GPU stage validation (before first E2E)

After preflight prints `READY FOR REAL VTO`, run isolated real stages on CUDA:

```bash
%cd /content/LAHI/ai
!python scripts/gpu_stage_validate.py \
  --person <PERSON_IMAGE> \
  --garment <GARMENT_IMAGE>
```

This sequentially validates agnostic mask (or SAM2 fallback), DensePose,
Florence (optional with `--skip-florence`), IDM-VTON, and the full
orchestrated job (`synthetic=false`). Outputs land under `ai/var/` and are not
committed.

Use `--json` for a machine-readable report with per-stage VRAM and timings.

---

## P. Local frontend configuration

In `frontend/.env` on the development machine (server-only):

```bash
AI_SERVER_URL=https://<TUNNEL_URL>
AI_SERVER_TOKEN=<AI_SERVER_TOKEN>
```

Restart Next.js (`npm run dev` from `frontend/`).

The browser must load results from `/api/vto/media/{jobId}`. It must never
call `/v1/assets/...` with the bearer token.

---

## Q. First real E2E test

Use a real person photo and a real garment photo. Synthetic 64×64 fixtures
only prove the HTTP contract; they are not GPU validation.

From the laptop:

```bash
cd ai
python scripts/e2e_tryon.py --base-url https://<TUNNEL_URL> --token "<AI_SERVER_TOKEN>" --person <PERSON_IMAGE> --garment <GARMENT_IMAGE> --timeout 900
```

Or create a try-on from the storefront after Next.js points at the tunnel.

Expect minutes, not seconds. Florence may download on the first garment stage.
Watch Colab for OOM or missing-module errors.

---

## R. Retrieving the result

- Harness: downloads `/v1/assets/{id}/content` with the bearer token and prints `synthetic=False`.
- Browser: `https://<your-next-app>/api/vto/media/{jobId}` after the commerce job is `COMPLETED`.
- On the worker: files under `AI_STORAGE_ROOT` (default `ai/var/assets`).

If `synthetic` is true in GPU mode, the job is failed (`unexpected_synthetic`). That is not a successful E2E.

---

## S. Cleanup

1. Stop `serve.py` and the tunnel (`Runtime → Interrupt` or kill the PIDs).
2. **Runtime → Disconnect and delete runtime** so the token and weights are not left on a shared VM.
3. Remove `<AI_SERVER_TOKEN>` from the notebook if you pasted it into a cell.
4. Do not commit `ai/weights/`, `ai/external/IDM-VTON/`, `ai/.env`, or `frontend/.env`.

---

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| `torch.cuda.is_available()` became False after pip | Recreate the T4 runtime. Do not `pip install torch`. Reinstall with `--no-deps` for SAM2. |
| SAM2 CUDA extension build failed | Ignored if you set `SAM2_BUILD_CUDA=0`. Image predictor still works. |
| `import sam2` fails | The `--no-deps` editable install did not run, or you are not on that Python. |
| `ModuleNotFoundError` inside IDM `src/` | The vendor file needs one extra package. Install **only that package**. Do not dump the official IDM requirements.txt. |
| 401 | Token mismatch between Colab and `frontend/.env` / `--token`. |
| readiness `not_ready` | `python scripts/preflight.py` — missing SAM2/IDM/pose files or CUDA. |
| `idm_weights_missing` | `src/` or `ckpt/` subfolders incomplete. |
| `cuda_required` | GPU mode but torch cannot see the T4. |
| Florence download hang | Network / HF rate limit. Set `HF_HOME` and retry the job; do not mark the worker broken. |
| OOM on T4 | Confirm sequential unload (`release_after_stage`) in logs. Close other GPU notebooks. |
| Browser image 401 | Browser hit `/v1/assets/...` instead of `/api/vto/media/{jobId}`. |
| CORS errors | Only if a browser calls `/v1` directly. `AI_ALLOWED_ORIGINS=*` on the worker. |
| Tunnel 1033 / 502 | `serve.py` is not listening on `0.0.0.0:8000`. |

Real Florence / SAM2 / pose / IDM-VTON inference is **not** complete until this session has actually produced a non-synthetic try-on image.
