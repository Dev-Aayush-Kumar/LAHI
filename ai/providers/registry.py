from dataclasses import replace

from providers.mock import (
    MockGarmentProvider,
    MockPoseProvider,
    MockSegmentationProvider,
    MockTryOnProvider,
)
from runtime.config import is_mock_mode
from services.garment_bbox import (
    CrossImageBoundingBoxError,
    assert_bbox_matches_image,
    build_florence_garment_schema,
)


def _florence_outputs(image_path: str):
    from services.florence_caption import generate_caption
    from services.florence_detection import detect_garment

    return generate_caption(image_path), detect_garment(image_path)


class FlorenceGarmentAdapter:
    name = "florence"
    version = "2-large-or-base"

    def analyze(self, image_path: str, asset_id: str | None = None):
        from PIL import Image
        from models.model_manager import FLORENCE_MODEL

        image = Image.open(image_path).convert("RGB")
        caption, detection = _florence_outputs(image_path)
        parsed = caption.get("parsed") or {}
        return build_florence_garment_schema(
            parsed=parsed,
            detection=detection,
            image_size=image.size,
            asset_id=asset_id,
            model_name=parsed.get("model_name") or FLORENCE_MODEL,
        )


class SAM2Adapter:
    name = "sam2"
    version = "local"

    def segment(self, image_path: str, garment, asset_id: str | None = None):
        from PIL import Image
        import numpy as np

        image = Image.open(image_path).convert("RGB")
        width, height = image.size
        if garment.bounding_box is not None:
            box = assert_bbox_matches_image(
                garment,
                asset_id=asset_id,
                image_size=(width, height),
            )
            bbox = np.array(box.to_list(), dtype=np.float32)
        else:
            bbox = np.array(
                [0.0, 0.0, float(max(width - 1, 0)), float(max(height - 1, 0))],
                dtype=np.float32,
            )
        from pathlib import Path

        from runtime.storage import assets
        from services.sam2_segmentation import segment_person

        mask_path = segment_person(image_path, bbox)
        mask_id = assets.put(
            Path(mask_path).read_bytes(),
            content_type="image/png",
            kind="mask",
            metadata={"provider": self.name, "source_asset_id": asset_id},
        )
        return {
            "mask_path_internal": mask_path,
            "mask_asset_id": mask_id,
            "provider": self.name,
            "version": self.version,
            "source_asset_id": asset_id,
            "image_size": [width, height],
        }


class PoseAdapter:
    name = "pose"
    version = "mediapipe"

    def detect(self, image_path: str, asset_id: str | None = None):
        from models.pose import detect_pose

        result = detect_pose(image_path)
        if result is None:
            return {
                "detected": False,
                "provider": self.name,
                "availability": "AVAILABLE_WHEN_WEIGHTS_PRESENT",
            }
        return {**result, "provider": self.name}


class IDMAdapter:
    name = "idm-vton"
    version = "local"

    def generate(
        self,
        person_image_path: str,
        garment_image_path: str,
        garment,
        mask,
        pose,
    ):
        from io import BytesIO

        from models.model_manager import current_device, idm_weights_present
        from runtime.provider_errors import ProviderUnavailable
        from runtime.storage import assets

        if not idm_weights_present():
            raise ProviderUnavailable(
                "idm_weights_missing",
                "IDM-VTON checkpoints are not available on this worker.",
            )
        if current_device() != "cuda":
            raise ProviderUnavailable(
                "cuda_required",
                "GPU mode requires CUDA for IDM-VTON. Refusing CPU fallback.",
            )

        mask_path = None
        if mask:
            mask_path = mask.get("mask_path_internal")
            if not mask_path and mask.get("mask_asset_id"):
                mask_path = assets.path_for_provider(mask["mask_asset_id"])
        if not mask_path:
            raise ProviderUnavailable(
                "segmentation_mask_missing",
                "IDM-VTON requires a person-image mask from the segmentation stage.",
            )

        from models.idm_loader import idm

        prompt = "a photo of a person"
        if garment is not None and getattr(garment, "garment_type", None):
            prompt = f"a photo of a person wearing a {garment.garment_type}"

        idm.load()
        result_image = idm.run(
            person_image_path,
            garment_image_path,
            mask_path,
            prompt=prompt,
        )
        buffer = BytesIO()
        result_image.save(buffer, format="PNG")
        result_id = assets.put(
            buffer.getvalue(),
            content_type="image/png",
            kind="tryon-result",
            metadata={"synthetic": False, "provider": self.name},
        )
        return {
            "output_asset_id": result_id,
            "generated_image_url": f"/v1/assets/{result_id}/content",
            "synthetic": False,
            "quality": {"passed": True, "notes": ["idm_vton"]},
            "provider": self.name,
            "version": self.version,
        }


def person_segmentation_input(garment):
    """Drop garment-image geometry before person-image segmentation."""

    return replace(garment, bounding_box=None)


def get_providers():
    if is_mock_mode():
        return {
            "garment": MockGarmentProvider(),
            "segmentation": MockSegmentationProvider(),
            "pose": MockPoseProvider(),
            "tryon": MockTryOnProvider(),
        }
    return {
        "garment": FlorenceGarmentAdapter(),
        "segmentation": SAM2Adapter(),
        "pose": PoseAdapter(),
        "tryon": IDMAdapter(),
    }


__all__ = [
    "CrossImageBoundingBoxError",
    "FlorenceGarmentAdapter",
    "IDMAdapter",
    "PoseAdapter",
    "SAM2Adapter",
    "get_providers",
    "person_segmentation_input",
]
