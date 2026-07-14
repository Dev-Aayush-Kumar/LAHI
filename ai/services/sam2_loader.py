from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

from models.model_manager import SAM2_DIR
from models.model_manager import models

import time


class SAMLoader:

    def __init__(self):

        self.predictor = None

    def load(self):

        if self.predictor is not None:
            return

        print("Loading SAM2...")

        start = time.time()

        model = build_sam2(
            str(SAM2_DIR / "sam2_hiera_l.yaml"),
            str(SAM2_DIR / "sam2_hiera_large.pt")
        )

        self.predictor = SAM2ImagePredictor(model)

        models.register_sam(self)

        print(
            f"SAM2 Loaded in {time.time()-start:.2f} sec"
        )


sam = SAMLoader()