"""Verify worker environment without loading or downloading multi-GB models.

Default AI_EXECUTION_MODE=mock is the diagnostic path: it reports WARNING or
NOT_READY without requiring CUDA. GPU mode treats missing CUDA/weights as
blockers. Exit code is 1 only for NOT_READY.
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import platform
import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from models.model_manager import (
    FLORENCE_MODEL,
    IDM_CKPT_DIR,
    IDM_CKPT_SUBFOLDERS,
    IDM_ROOT_DIR,
    IDM_SOURCE_FILES,
    POSE_MODEL,
    florence_cached,
    gpu_diagnostics,
    idm_weights_present,
    pose_weights_present,
    sam2_checkpoint_path,
    sam2_config_path,
    sam2_weights_present,
)
from runtime.config import (
    ALLOWED_ORIGINS,
    HOST,
    PORT,
    SERVER_TOKEN,
    STORAGE_ROOT,
    env,
    execution_mode,
    is_mock_mode,
    queue_backend,
    vram_budget_mb,
)

SERVICE_PACKAGES = (
    "fastapi",
    "uvicorn",
    "PIL",
    "numpy",
    "scipy",
    "cv2",
    "httpx",
)
GPU_PACKAGES = (
    "transformers",
    "diffusers",
    "accelerate",
    "safetensors",
    "huggingface_hub",
    "einops",
    "timm",
)
SAM2_SUPPORT_PACKAGES = (
    "hydra",
    "iopath",
    "tqdm",
)
SAM2_PACKAGE = "sam2"
POSE_PACKAGE = "mediapipe"


def _package_ok(name: str) -> bool:
    try:
        importlib.import_module(name)
        return True
    except Exception:
        return False


def _writable(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".lahi_preflight_write"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        return True
    except OSError:
        return False


def _python_supported(version: str) -> tuple[bool, str | None]:
    parts = version.split(".")
    try:
        major, minor = int(parts[0]), int(parts[1])
    except (TypeError, ValueError, IndexError):
        return False, "Could not parse Python version."
    if (major, minor) < (3, 10):
        return False, "Python 3.10+ is required."
    if (major, minor) >= (3, 13):
        return True, "Python 3.13+ is OK for mock tests; Colab T4 workers should use 3.10–3.12."
    return True, None


def collect() -> dict:
    gpu = gpu_diagnostics()
    mock = is_mock_mode()
    python = sys.version.split()[0]
    python_ok, python_note = _python_supported(python)

    service_packages = {name: _package_ok(name) for name in SERVICE_PACKAGES}
    gpu_packages = {name: _package_ok(name) for name in GPU_PACKAGES}
    sam2_support = {name: _package_ok(name) for name in SAM2_SUPPORT_PACKAGES}
    torchvision_ok = _package_ok("torchvision")
    optional = {
        "sam2": _package_ok(SAM2_PACKAGE),
        "mediapipe": _package_ok(POSE_PACKAGE),
        "flash_attn": _package_ok("flash_attn"),
        "torch": gpu.get("torch") is not None,
        "torchvision": torchvision_ok,
        "torchaudio": _package_ok("torchaudio"),
    }

    missing_idm_sources = [str(path) for path in IDM_SOURCE_FILES if not path.exists()]
    missing_idm_ckpts = [
        str(IDM_CKPT_DIR / folder)
        for folder in IDM_CKPT_SUBFOLDERS
        if not (IDM_CKPT_DIR / folder).exists()
    ]

    storage = Path(env("AI_STORAGE_ROOT") or STORAGE_ROOT)
    report = {
        "status": "READY",
        "python": python,
        "platform": platform.platform(),
        "execution_mode": execution_mode(),
        "queue_backend": queue_backend(),
        "token_configured": bool(SERVER_TOKEN),
        "bind": {"host": HOST, "port": PORT},
        "allowed_origins": ALLOWED_ORIGINS,
        "vram_budget_mb": vram_budget_mb(),
        "environment": {
            "AI_EXECUTION_MODE": execution_mode(),
            "AI_QUEUE_BACKEND": queue_backend(),
            "AI_HOST": HOST,
            "AI_PORT": str(PORT),
            "AI_ALLOWED_ORIGINS": ",".join(ALLOWED_ORIGINS),
            "AI_STORAGE_ROOT": str(storage),
            "AI_FLORENCE_MODEL": FLORENCE_MODEL,
            "AI_IDM_ROOT": str(IDM_ROOT_DIR),
            "AI_VRAM_BUDGET_MB": str(vram_budget_mb()),
            "HF_HOME": os.getenv("HF_HOME") or "",
            "AI_SERVER_TOKEN": "set" if SERVER_TOKEN else "",
        },
        "gpu": gpu,
        "packages": service_packages,
        "gpu_packages": gpu_packages,
        "sam2_support_packages": sam2_support,
        "optional_packages": optional,
        "weights": {
            "florence_model": FLORENCE_MODEL,
            "florence_cached": florence_cached(),
            "sam2_checkpoint": str(sam2_checkpoint_path()),
            "sam2_config": str(sam2_config_path()),
            "sam2": sam2_weights_present(),
            "idm_root": str(IDM_ROOT_DIR),
            "idm_ckpt": str(IDM_CKPT_DIR),
            "idm": idm_weights_present(),
            "idm_missing_sources": missing_idm_sources,
            "idm_missing_checkpoints": missing_idm_ckpts,
            "pose": str(POSE_MODEL),
            "pose_present": pose_weights_present(),
        },
        "storage": {
            "root": str(storage),
            "writable": _writable(storage),
        },
        "notes": [
            "flash-attn is optional and not required.",
            "Florence-2 may download into the Hugging Face cache on first GPU job, not at startup.",
            "This preflight does not load models or run inference.",
        ],
        "blockers": [],
        "warnings": [],
    }

    if not python_ok:
        report["blockers"].append(python_note)
    elif python_note:
        report["warnings"].append(python_note)

    if not SERVER_TOKEN:
        report["blockers"].append("AI_SERVER_TOKEN is empty.")
    missing_service = [name for name, ok in service_packages.items() if not ok]
    if missing_service:
        report["blockers"].append(f"Missing service packages: {', '.join(missing_service)}")
    if not report["storage"]["writable"]:
        report["blockers"].append(f"Asset directory is not writable: {storage}")

    if optional["flash_attn"]:
        report["warnings"].append(
            "flash-attn is installed. LAHI does not require it; Florence uses eager attention."
        )

    if mock:
        report["warnings"].append("AI_EXECUTION_MODE=mock. Real GPU inference is not selected.")
        if not optional["torch"]:
            report["warnings"].append("torch is not installed. That is OK for mock tests only.")
    else:
        if not optional["torch"]:
            report["blockers"].append("torch is not importable in GPU mode.")
        elif not gpu.get("cuda_available"):
            report["blockers"].append("CUDA is not available in GPU mode.")
        if optional["torch"] and not optional["torchvision"]:
            report["blockers"].append(
                "torchvision is not importable. Use the GPU runtime's matching CUDA wheel; do not pip-install a CPU build."
            )
        if gpu.get("cuda_available") and gpu.get("gpu_name") and "T4" not in str(gpu.get("gpu_name")):
            report["warnings"].append(
                f"GPU is {gpu.get('gpu_name')}. The first E2E target is a Tesla T4 (~15 GB)."
            )
        if gpu.get("vram_total_mb") is not None and gpu["vram_total_mb"] < 12000:
            report["warnings"].append(
                f"Reported VRAM is {gpu['vram_total_mb']} MB; IDM-VTON expects ~11 GB plus headroom."
            )
        missing_gpu = [name for name, ok in gpu_packages.items() if not ok]
        if missing_gpu:
            report["blockers"].append(f"Missing GPU packages: {', '.join(missing_gpu)}")
        missing_sam2_support = [name for name, ok in sam2_support.items() if not ok]
        if missing_sam2_support:
            report["blockers"].append(
                "Missing SAM2 support packages: " + ", ".join(missing_sam2_support)
            )
        if not optional["sam2"]:
            report["blockers"].append(
                "sam2 is not importable. Install facebookresearch/sam2 with "
                "SAM2_BUILD_CUDA=0 pip install --no-deps so Colab torch is not replaced."
            )
        if not optional["mediapipe"]:
            report["blockers"].append("mediapipe is not importable.")
        if not sam2_weights_present():
            report["blockers"].append(
                "SAM2 checkpoint/config is missing. "
                f"Expected {sam2_checkpoint_path()} and {sam2_config_path()}."
            )
        if not idm_weights_present():
            detail = []
            if missing_idm_sources:
                detail.append("sources: " + ", ".join(Path(item).name for item in missing_idm_sources))
            if missing_idm_ckpts:
                detail.append("ckpt: " + ", ".join(Path(item).name for item in missing_idm_ckpts))
            report["blockers"].append(
                "IDM-VTON sources or ckpt/ tree is incomplete. " + "; ".join(detail)
            )
        if not pose_weights_present():
            report["blockers"].append(f"Pose landmarker weights are missing: {POSE_MODEL}")
        if not florence_cached():
            report["warnings"].append(
                f"Florence weights for {FLORENCE_MODEL} are not in the Hugging Face cache. "
                "The first garment-analysis call may download them. This is not a blocker."
            )

    if report["blockers"]:
        report["status"] = "NOT_READY"
    elif report["warnings"]:
        report["status"] = "WARNING"
    else:
        report["status"] = "READY"
    return report


def main() -> int:
    parser = argparse.ArgumentParser(
        description="LAHI GPU/mock preflight. Does not download or load model weights."
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the full report as JSON.",
    )
    args = parser.parse_args()
    report = collect()
    if args.json:
        print(json.dumps(report, indent=2, default=str))
        return 1 if report["status"] == "NOT_READY" else 0
    print(f"LAHI AI preflight  status={report['status']}")
    print(f"  python          {report['python']}")
    print(f"  execution_mode  {report['execution_mode']}")
    print(f"  queue           {report['queue_backend']}")
    print(f"  token           {'set' if report['token_configured'] else 'MISSING'}")
    print(f"  bind            {report['bind']['host']}:{report['bind']['port']}")
    gpu = report["gpu"]
    print(f"  torch           {gpu.get('torch')}")
    print(f"  torchvision     {report['optional_packages']['torchvision']}")
    print(f"  cuda            {gpu.get('cuda_available')} ({gpu.get('cuda_version')})")
    print(f"  device          {gpu.get('device')}")
    print(f"  gpu             {gpu.get('gpu_name') or 'none'}")
    if gpu.get("vram_total_mb") is not None:
        print(
            f"  vram            allocated={gpu.get('vram_allocated_mb')} "
            f"total={gpu.get('vram_total_mb')} MB"
        )
    weights = report["weights"]
    print(f"  florence cache  {weights['florence_cached']} ({weights['florence_model']})")
    print(f"  sam2            {weights['sam2']}")
    print(f"  idm-vton        {weights['idm']}")
    print(f"  pose            {weights['pose_present']}")
    print(f"  storage         {report['storage']['root']} writable={report['storage']['writable']}")
    print(f"  flash-attn      {report['optional_packages']['flash_attn']} (optional)")
    if report["warnings"]:
        print("WARNINGS:")
        for item in report["warnings"]:
            print(f"  - {item}")
    if report["blockers"]:
        print("BLOCKERS:")
        for item in report["blockers"]:
            print(f"  - {item}")
        return 1
    if report["status"] == "WARNING":
        print("Preflight WARNING: the service can start, but review the notes above.")
        return 0
    print("Preflight READY.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
