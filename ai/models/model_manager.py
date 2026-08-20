from pathlib import Path

try:
    import torch
except ImportError:  # The API contract must remain importable without torch.
    torch = None

DEVICE = "cuda" if torch is not None and torch.cuda.is_available() else "cpu"
PRECISION = "fp16" if DEVICE == "cuda" else "fp32"

BASE_DIR = Path(__file__).resolve().parent.parent

WEIGHTS_DIR = BASE_DIR / "weights"

FLORENCE_MODEL = "microsoft/Florence-2-base"

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
IDM_ROOT_DIR = BASE_DIR / "external" / "IDM-VTON"
IDM_CKPT_DIR = IDM_ROOT_DIR / "ckpt"
IDM_SRC_DIR = IDM_ROOT_DIR / "src"

# Sequential T4 (~15GB) budget. These are planning numbers, not measurements.
VRAM_BUDGET_MB = 15000
MODEL_VRAM_MB = {
    "florence": 6000,
    "sam2": 3500,
    "idm": 11000,
    "pose": 500,
}


class ModelManager:
    """Lazy registry. Heavyweight weights are never loaded at API import time."""

    def __init__(self):
        self.florence = None
        self.sam2 = None
        self.idm = None
        self._resident: list[str] = []

    def register_florence(self, loader):
        self.florence = loader
        self._remember("florence")

    def register_sam(self, loader):
        self.sam2 = loader
        self._remember("sam2")

    def register_idm(self, loader):
        self.idm = loader
        self._remember("idm")

    def _remember(self, name: str):
        if name not in self._resident:
            self._resident.append(name)

    def unload(self, name: str) -> None:
        if name == "florence":
            self.florence = None
        elif name == "sam2":
            self.sam2 = None
        elif name == "idm":
            self.idm = None
        self._resident = [item for item in self._resident if item != name]
        if torch is not None and torch.cuda.is_available():
            torch.cuda.empty_cache()

    def ensure_vram_for(self, name: str) -> None:
        required = MODEL_VRAM_MB.get(name, 0)
        used = sum(MODEL_VRAM_MB.get(item, 0) for item in self._resident)
        while self._resident and used + required > VRAM_BUDGET_MB:
            oldest = self._resident[0]
            if oldest == name:
                break
            self.unload(oldest)
            used = sum(MODEL_VRAM_MB.get(item, 0) for item in self._resident)

    def info(self):
        info = {
            "device": DEVICE,
            "precision": PRECISION,
            "vram_budget_mb": VRAM_BUDGET_MB,
            "resident": list(self._resident),
            "florence": {
                "name": "Florence-2",
                "provider": "microsoft",
                "model": FLORENCE_MODEL,
                "version": "base",
                "configured": True,
                "loaded": self.florence is not None,
                "status": "loaded" if self.florence is not None else "unloaded",
                "device": DEVICE,
                "precision": PRECISION,
                "capabilities": ["garment_understanding", "caption"],
                "memory_mb": MODEL_VRAM_MB["florence"],
            },
            "sam2": {
                "name": "SAM2",
                "provider": "facebook",
                "weights": SAM2_DIR.exists(),
                "loaded": self.sam2 is not None,
                "status": "loaded" if self.sam2 is not None else "unloaded",
                "device": DEVICE,
                "capabilities": ["segmentation"],
                "memory_mb": MODEL_VRAM_MB["sam2"],
            },
            "idm": {
                "name": "IDM-VTON",
                "provider": "idm-vton",
                "checkpoint": IDM_CKPT_DIR.exists(),
                "loaded": self.idm is not None,
                "status": "loaded" if self.idm is not None else "unloaded",
                "device": DEVICE,
                "capabilities": ["virtual_try_on"],
                "memory_mb": MODEL_VRAM_MB["idm"],
            },
            "pose": {
                "name": "Pose landmarker",
                "provider": "mediapipe",
                "weights": POSE_MODEL.exists(),
                "status": "available" if POSE_MODEL.exists() else "missing_weights",
                "capabilities": ["pose"],
                "memory_mb": MODEL_VRAM_MB["pose"],
            },
        }
        info["ready"] = (
            info["pose"]["weights"]
            and info["florence"]["loaded"]
            and info["sam2"]["loaded"]
            and info["idm"]["loaded"]
        )
        return info


models = ModelManager()
