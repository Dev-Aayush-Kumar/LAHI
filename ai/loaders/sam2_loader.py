import time

from models.model_manager import (
    models,
    sam2_checkpoint_path,
    sam2_config_path,
)


class SAMLoader:

    def __init__(self):
        self.predictor = None

    def load(self):

        if self.predictor is not None:
            return

        from models.model_manager import current_device, models as model_registry

        model_registry.ensure_vram_for("sam2")
        start = time.time()

        print("Loading SAM2...")

        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor

        model = build_sam2(
            str(sam2_config_path()),
            str(sam2_checkpoint_path()),
            device=current_device(),
        )

        self.predictor = SAM2ImagePredictor(model)

        models.register_sam(self)

        print(
            f"SAM2 loaded in {time.time()-start:.2f}s"
        )

    def release(self):
        self.predictor = None


sam = SAMLoader()
