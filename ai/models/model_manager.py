from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from runtime.config import env, vram_budget_mb
from runtime.vram import empty_cache, snapshot as vram_snapshot

try:
    import torch
except ImportError:  # The API contract must remain importable without torch.
    torch = None


def current_device() -> str:
    return "cuda" if torch is not None and torch.cuda.is_available() else "cpu"


def current_precision() -> str:
    return "fp16" if current_device() == "cuda" else "fp32"


DEVICE = current_device()
PRECISION = current_precision()

BASE_DIR = Path(__file__).resolve().parent.parent

WEIGHTS_DIR = BASE_DIR / "weights"

FLORENCE_MODEL = env("AI_FLORENCE_MODEL") or "microsoft/Florence-2-base"

SAM2_DIR = WEIGHTS_DIR / "sam2"

POSE_MODEL = WEIGHTS_DIR / "pose_landmarker_lite.task"

SAM2_CONFIG_HYDRA = SAM2_DIR / "configs" / "sam2.1" / "sam2.1_hiera_t.yaml"
SAM2_CONFIG_FLAT = SAM2_DIR / "configs" / "sam2.1_hiera_t.yaml"
SAM2_CHECKPOINT = SAM2_DIR / "checkpoints" / "sam2.1_hiera_tiny.pt"


def sam2_checkpoint_path() -> Path:
    """Absolute checkpoint path under the AI weights directory."""

    return SAM2_CHECKPOINT.resolve()


def sam2_config_path() -> Path:
    """Absolute SAM2 config path, independent of process CWD.

    Prefers the hydra-style layout under ``weights/sam2`` when present,
    otherwise the flat config used by the local weights checkout.
    """

    hydra = SAM2_CONFIG_HYDRA.resolve()
    flat = SAM2_CONFIG_FLAT.resolve()
    if hydra.exists():
        return hydra
    if flat.exists():
        return flat
    return hydra


# External AI repositories
IDM_ROOT_DIR = Path(env("AI_IDM_ROOT") or str(BASE_DIR / "external" / "IDM-VTON"))
IDM_CKPT_DIR = IDM_ROOT_DIR / "ckpt"
IDM_SRC_DIR = IDM_ROOT_DIR / "src"

IDM_SOURCE_FILES = (
    IDM_SRC_DIR / "unet_hacked_tryon.py",
    IDM_SRC_DIR / "unet_hacked_garmnet.py",
    IDM_SRC_DIR / "tryon_pipeline.py",
)
IDM_CKPT_SUBFOLDERS = (
    "scheduler",
    "vae",
    "unet",
    "image_encoder",
    "unet_encoder",
    "text_encoder",
    "text_encoder_2",
    "tokenizer",
    "tokenizer_2",
)

# Sequential T4 (~15GB) budget. These are planning numbers, not measurements.
VRAM_BUDGET_MB = vram_budget_mb()
MODEL_VRAM_MB = {
    "florence": 6000,
    "sam2": 3500,
    "openpose": 2500,
    "densepose": 3500,
    "idm": 11000,
    "pose": 500,
}

# Optional IDM conditioning assets (DensePose / OpenPose / parsing).
DENSEPOSE_CKPT = IDM_CKPT_DIR / "densepose" / "model_final_162be9.pkl"
DENSEPOSE_CONFIG = IDM_ROOT_DIR / "configs" / "densepose_rcnn_R_50_FPN_s1x.yaml"
OPENPOSE_BODY = IDM_CKPT_DIR / "openpose" / "ckpts" / "body_pose_model.pth"
PARSING_ATR = IDM_CKPT_DIR / "humanparsing" / "parsing_atr.onnx"
PARSING_LIP = IDM_CKPT_DIR / "humanparsing" / "parsing_lip.onnx"


def florence_cache_dir() -> Path:
    hf_home = Path(os.getenv("HF_HOME") or (Path.home() / ".cache" / "huggingface"))
    slug = FLORENCE_MODEL.replace("/", "--")
    return hf_home / "hub" / f"models--{slug}"


def florence_cached() -> bool:
    return florence_cache_dir().exists()


def sam2_weights_present() -> bool:
    return sam2_checkpoint_path().exists() and sam2_config_path().exists()


def pose_weights_present() -> bool:
    return POSE_MODEL.exists()


def idm_weights_present() -> bool:
    if not IDM_CKPT_DIR.exists():
        return False
    if not all(path.exists() for path in IDM_SOURCE_FILES):
        return False
    return all((IDM_CKPT_DIR / folder).exists() for folder in IDM_CKPT_SUBFOLDERS)


def densepose_weights_present() -> bool:
    return DENSEPOSE_CKPT.exists() and DENSEPOSE_CONFIG.exists()


def openpose_weights_present() -> bool:
    return OPENPOSE_BODY.exists()


def parsing_weights_present() -> bool:
    return PARSING_ATR.exists() and PARSING_LIP.exists()


def agnostic_mask_assets_present() -> bool:
    return openpose_weights_present() and parsing_weights_present()


def idm_conditioning_ready() -> bool:
    """DensePose is mandatory for real IDM-VTON; agnostic mask assets preferred."""

    return idm_weights_present() and densepose_weights_present()


def gpu_diagnostics() -> dict[str, Any]:
    info = vram_snapshot()
    info["device"] = current_device()
    info["precision"] = current_precision()
    info["torch"] = getattr(torch, "__version__", None) if torch is not None else None
    if torch is not None:
        info["cuda_built"] = bool(getattr(torch.version, "cuda", None))
        info["cuda_version"] = getattr(torch.version, "cuda", None)
        if torch.cuda.is_available():
            try:
                info["vram_peak_allocated_mb"] = int(
                    torch.cuda.max_memory_allocated() / (1024 * 1024)
                )
                info["vram_peak_reserved_mb"] = int(
                    torch.cuda.max_memory_reserved() / (1024 * 1024)
                )
            except Exception:
                pass
    return info


class ModelManager:
    """Lazy registry. Heavyweight weights are never loaded at API import time."""

    def __init__(self):
        self.florence = None
        self.sam2 = None
        self.openpose = None
        self.densepose = None
        self.idm = None
        self._resident: list[str] = []

    def register_florence(self, loader):
        self.florence = loader
        self._remember("florence")

    def register_sam(self, loader):
        self.sam2 = loader
        self._remember("sam2")

    def register_openpose(self, loader):
        self.openpose = loader
        self._remember("openpose")

    def register_densepose(self, loader):
        self.densepose = loader
        self._remember("densepose")

    def register_idm(self, loader):
        self.idm = loader
        self._remember("idm")

    def _remember(self, name: str):
        if name not in self._resident:
            self._resident.append(name)

    def unload(self, name: str) -> None:
        loader = getattr(self, name, None)
        if loader is not None and hasattr(loader, "release"):
            loader.release()
        if name == "florence":
            self.florence = None
        elif name == "sam2":
            self.sam2 = None
        elif name == "openpose":
            self.openpose = None
        elif name == "densepose":
            self.densepose = None
        elif name == "idm":
            self.idm = None
        self._resident = [item for item in self._resident if item != name]
        empty_cache()

    def ensure_vram_for(self, name: str) -> None:
        required = MODEL_VRAM_MB.get(name, 0)
        used = sum(MODEL_VRAM_MB.get(item, 0) for item in self._resident)
        while self._resident and used + required > VRAM_BUDGET_MB:
            oldest = self._resident[0]
            if oldest == name:
                break
            self.unload(oldest)
            used = sum(MODEL_VRAM_MB.get(item, 0) for item in self._resident)

    def release_after_stage(self, name: str) -> None:
        """Drop a finished stage so the next T4-resident model can load."""

        if name in self._resident:
            self.unload(name)

    def info(self):
        device = current_device()
        precision = current_precision()
        weights = {
            "florence_cached": florence_cached(),
            "sam2": sam2_weights_present(),
            "idm": idm_weights_present(),
            "densepose": densepose_weights_present(),
            "openpose": openpose_weights_present(),
            "parsing": parsing_weights_present(),
            "agnostic_mask": agnostic_mask_assets_present(),
            "pose": pose_weights_present(),
            "idm_conditioning": idm_conditioning_ready(),
        }
        info = {
            "device": device,
            "precision": precision,
            "vram_budget_mb": VRAM_BUDGET_MB,
            "resident": list(self._resident),
            "gpu": gpu_diagnostics(),
            "weights": weights,
            "florence": {
                "name": "Florence-2",
                "provider": "microsoft",
                "model": FLORENCE_MODEL,
                "version": "base",
                "configured": True,
                "cached": weights["florence_cached"],
                "loaded": self.florence is not None,
                "status": "loaded" if self.florence is not None else "unloaded",
                "device": device,
                "precision": precision,
                "capabilities": ["garment_understanding", "caption"],
                "memory_mb": MODEL_VRAM_MB["florence"],
            },
            "sam2": {
                "name": "SAM2",
                "provider": "facebook",
                "weights": weights["sam2"],
                "loaded": self.sam2 is not None,
                "status": "loaded" if self.sam2 is not None else "unloaded",
                "device": device,
                "capabilities": ["segmentation"],
                "memory_mb": MODEL_VRAM_MB["sam2"],
            },
            "densepose": {
                "name": "DensePose",
                "provider": "detectron2",
                "weights": weights["densepose"],
                "loaded": self.densepose is not None,
                "status": "loaded" if self.densepose is not None else "unloaded",
                "device": device,
                "capabilities": ["idm_pose_conditioning"],
                "memory_mb": MODEL_VRAM_MB["densepose"],
            },
            "idm": {
                "name": "IDM-VTON",
                "provider": "idm-vton",
                "checkpoint": weights["idm"],
                "conditioning": weights["idm_conditioning"],
                "loaded": self.idm is not None,
                "status": "loaded" if self.idm is not None else "unloaded",
                "device": device,
                "capabilities": ["virtual_try_on"],
                "memory_mb": MODEL_VRAM_MB["idm"],
            },
            "pose": {
                "name": "Pose landmarker",
                "provider": "mediapipe",
                "weights": weights["pose"],
                "status": "available" if weights["pose"] else "missing_weights",
                "capabilities": ["pose"],
                "memory_mb": MODEL_VRAM_MB["pose"],
            },
        }
        # Ready = diffusion ckpts + DensePose + (agnostic mask assets OR SAM2 fallback)
        # + MediaPipe for human_preprocessing jobs.
        mask_ok = weights["agnostic_mask"] or weights["sam2"]
        info["ready"] = bool(
            weights["idm"]
            and weights["densepose"]
            and mask_ok
            and weights["pose"]
        )
        return info


models = ModelManager()
