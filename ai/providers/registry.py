from providers.mock import (
    MockGarmentProvider,
    MockPoseProvider,
    MockSegmentationProvider,
    MockTryOnProvider,
)
from runtime.config import is_mock_mode


class FlorenceGarmentAdapter:
    name = "florence"
    version = "2-large-or-base"

    def analyze(self, image_path: str, asset_id: str | None = None):
        from services.florence_caption import generate_caption
        from services.garment_schema import GarmentSchema, ProcessingStatus

        result = generate_caption(image_path)
        parsed = result.get("parsed") or {}
        schema = GarmentSchema(
            garment_type=parsed.get("garment_type"),
            category=parsed.get("category"),
            confidence=parsed.get("confidence"),
            attributes=parsed.get("attributes") or {},
            primary_color=parsed.get("primary_color"),
            secondary_color=parsed.get("secondary_color"),
            fabric=parsed.get("fabric"),
            pattern=parsed.get("pattern"),
            sleeve=parsed.get("sleeve"),
            fit=parsed.get("fit"),
            style=parsed.get("style"),
            occasion=parsed.get("occasion"),
            gender=parsed.get("gender"),
            season=parsed.get("season"),
            source_asset_ref=asset_id,
            model_provider="microsoft",
            model_name=parsed.get("model_name"),
            processing_status=ProcessingStatus.COMPLETED,
        )
        if parsed.get("bounding_box"):
            from services.garment_schema import BoundingBox

            box = parsed["bounding_box"]
            schema.bounding_box = BoundingBox(*box)
        return schema


class SAM2Adapter:
    name = "sam2"
    version = "local"

    def segment(self, image_path: str, garment, asset_id: str | None = None):
        from services.sam2_segmentation import segment_person
        import numpy as np

        if not garment.bounding_box:
            raise RuntimeError("SAM2 requires a garment bounding box.")
        bbox = np.array(garment.bounding_box.to_list(), dtype=np.float32)
        mask_path = segment_person(image_path, bbox)
        return {
            "mask_path_internal": mask_path,
            "provider": self.name,
            "version": self.version,
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
        raise RuntimeError(
            "Real IDM-VTON inference is deferred until the GPU integration test."
        )


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
