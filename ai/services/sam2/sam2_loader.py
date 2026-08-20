import torch
from models.model_manager import models, sam2_checkpoint_path, sam2_config_path

SAM2_PREDICTOR = None


def load_sam2():

    global SAM2_PREDICTOR

    if SAM2_PREDICTOR is not None:
        return SAM2_PREDICTOR

    checkpoint = sam2_checkpoint_path()
    config = sam2_config_path()

    if not checkpoint.exists() or not config.exists():
        raise RuntimeError(
            f"SAM2 assets are missing: {checkpoint} and {config}"
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
        str(config),
        str(checkpoint),
        device=device
    )

    SAM2_PREDICTOR = SAM2ImagePredictor(model)
    models.register_sam(SAM2_PREDICTOR)

    print("SAM2 Loaded")

    return SAM2_PREDICTOR