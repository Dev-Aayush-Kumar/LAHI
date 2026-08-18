from pathlib import Path
import torch
from models.model_manager import models


BASE = Path(__file__).resolve().parents[2]

CHECKPOINT = (
    BASE /
    "weights" /
    "sam2" /
    "checkpoints" /
    "sam2.1_hiera_tiny.pt"
)

CONFIG = (
    BASE /
    "weights" /
    "sam2" /
    "configs" /
    "sam2.1_hiera_t.yaml"
)

SAM2_PREDICTOR = None


def load_sam2():

    global SAM2_PREDICTOR

    if SAM2_PREDICTOR is not None:
        return SAM2_PREDICTOR

    if not CHECKPOINT.exists() or not CONFIG.exists():
        raise RuntimeError(
            f"SAM2 assets are missing: {CHECKPOINT} and {CONFIG}"
        )

    try:
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor
    except ImportError as error:
        raise RuntimeError(
            "SAM2 is not installed or available on PYTHONPATH"
        ) from error

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    print(f"Loading SAM2 on {device}")

    model = build_sam2(
        str(CONFIG),
        str(CHECKPOINT),
        device=device
    )

    SAM2_PREDICTOR = SAM2ImagePredictor(model)
    models.register_sam(SAM2_PREDICTOR)

    print("SAM2 Loaded")

    return SAM2_PREDICTOR