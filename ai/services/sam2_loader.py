from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

from models.model_manager import SAM2_DIR
from models.model_manager import models
import torch
import time

device = "cuda" if torch.cuda.is_available() else "cpu"
class SAMLoader:

    def __init__(self):

        self.predictor = None

    def load(self):

        if self.predictor is not None:
            return

        print("Loading SAM2...")

        start = time.time()

        model = build_sam2(
            "configs/sam2.1/sam2.1_hiera_t.yaml",
            str(SAM2_DIR / "checkpoints" / "sam2.1_hiera_tiny.pt"),
            device=device,
        )

        self.predictor = SAM2ImagePredictor(model)

        models.register_sam(self)

        print(
            f"SAM2 Loaded in {time.time()-start:.2f} sec"
        )


sam = SAMLoader()