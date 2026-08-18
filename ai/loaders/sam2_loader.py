import time

from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

from models.model_manager import (
    DEVICE,
    SAM2_DIR,
    models,
)

class SAMLoader:

    def __init__(self):
        self.predictor = None

    def load(self):

        if self.predictor is not None:
            return

        start = time.time()

        print("Loading SAM2...")

        model = build_sam2(
            "configs/sam2.1/sam2.1_hiera_t.yaml",
            str(SAM2_DIR / "checkpoints" / "sam2.1_hiera_tiny.pt"),
            device=DEVICE,
        )

        self.predictor = SAM2ImagePredictor(model)

        models.register_sam(self)

        print(
            f"SAM2 loaded in {time.time()-start:.2f}s"
        )


sam = SAMLoader()