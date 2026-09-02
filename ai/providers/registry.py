from dataclasses import replace
from io import BytesIO
from pathlib import Path

from providers.mock import (
    MockGarmentProvider,
    MockPoseProvider,
    MockSegmentationProvider,
    MockTryOnProvider,
)
from runtime.config import is_mock_mode
from runtime.provider_errors import ProviderUnavailable
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


class AgnosticMaskAdapter:
    """Preferred IDM mask path: OpenPose + human parsing → agnostic inpaint mask."""

    name = "idm-agnostic-mask"
    version = "openpose-parsing"

    def segment(self, image_path: str, garment, asset_id: str | None = None):
        from PIL import Image

        from models.idm_conditioning import (
            agnostic_mask,
            garment_mask_category,
            validate_mask_image,
        )
        from models.model_manager import models
        from runtime.storage import assets

        person = Image.open(image_path).convert("RGB")
        category = garment_mask_category(garment)
        agnostic_mask.load()
        try:
            mask = agnostic_mask.run(person, category=category)
        finally:
            models.release_after_stage("openpose")
        mask = validate_mask_image(mask, source="agnostic")
        buffer = BytesIO()
        mask.save(buffer, format="PNG")
        mask_id = assets.put(
            buffer.getvalue(),
            content_type="image/png",
            kind="mask",
            metadata={
                "provider": self.name,
                "source_asset_id": asset_id,
                "mask_kind": "agnostic",
                "category": category,
                "width": mask.size[0],
                "height": mask.size[1],
            },
        )
        # Persist a working copy the try-on stage can open by path.
        work = Path(assets.path_for_provider(mask_id))
        return {
            "mask_path_internal": str(work),
            "mask_asset_id": mask_id,
            "provider": self.name,
            "version": self.version,
            "source_asset_id": asset_id,
            "image_size": list(mask.size),
            "mask_kind": "agnostic",
            "category": category,
        }


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
        from models.idm_conditioning import IDM_SIZE, validate_mask_image
        from runtime.storage import assets
        from services.sam2_segmentation import segment_person

        mask_path = segment_person(image_path, bbox)
        mask = validate_mask_image(
            Image.open(mask_path).convert("L").resize(
                IDM_SIZE, Image.Resampling.NEAREST
            ),
            source="sam2",
            allow_full=True,
        )
        buffer = BytesIO()
        mask.save(buffer, format="PNG")
        mask_id = assets.put(
            buffer.getvalue(),
            content_type="image/png",
            kind="mask",
            metadata={
                "provider": self.name,
                "source_asset_id": asset_id,
                "mask_kind": "sam2_fallback",
                "source_width": width,
                "source_height": height,
                "width": mask.size[0],
                "height": mask.size[1],
            },
        )
        work = Path(assets.path_for_provider(mask_id))
        return {
            "mask_path_internal": str(work),
            "mask_asset_id": mask_id,
            "provider": self.name,
            "version": self.version,
            "source_asset_id": asset_id,
            "image_size": [width, height],
            "mask_size": list(mask.size),
            "mask_kind": "sam2_fallback",
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


class DensePoseAdapter:
    name = "densepose"
    version = "detectron2"

    def detect(self, image_path: str, asset_id: str | None = None):
        from PIL import Image

        from models.idm_conditioning import IDM_SIZE, densepose
        from models.model_manager import densepose_weights_present, models
        from runtime.storage import assets

        if not densepose_weights_present():
            raise ProviderUnavailable(
                "densepose_weights_missing",
                "DensePose checkpoint/config is required for real IDM-VTON.",
            )
        person = Image.open(image_path).convert("RGB")
        densepose.load()
        try:
            pose_img = densepose.run(person)
        finally:
            models.release_after_stage("densepose")

        if pose_img.size != IDM_SIZE:
            pose_img = pose_img.resize(IDM_SIZE, Image.Resampling.LANCZOS)
        buffer = BytesIO()
        pose_img.save(buffer, format="PNG")
        pose_id = assets.put(
            buffer.getvalue(),
            content_type="image/png",
            kind="densepose",
            metadata={"provider": self.name, "source_asset_id": asset_id},
        )
        return {
            "detected": True,
            "provider": self.name,
            "version": self.version,
            "pose_asset_id": pose_id,
            "pose_path_internal": assets.path_for_provider(pose_id),
            "image_size": list(pose_img.size),
            "availability": "AVAILABLE",
        }


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
        from models.idm_conditioning import garment_description, validate_mask_image
        from models.model_manager import current_device, idm_conditioning_ready
        from runtime.storage import assets
        from PIL import Image

        if not idm_conditioning_ready():
            raise ProviderUnavailable(
                "idm_weights_missing",
                "IDM-VTON diffusion checkpoints and/or DensePose assets are not available.",
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
        validate_mask_image(Image.open(mask_path), source="tryon")

        pose_path = None
        if pose:
            pose_path = pose.get("pose_path_internal")
            if not pose_path and pose.get("pose_asset_id"):
                pose_path = assets.path_for_provider(pose["pose_asset_id"])
        if not pose_path:
            raise ProviderUnavailable(
                "densepose_missing",
                "IDM-VTON requires DensePose pose_img from the densepose stage.",
            )

        from models.idm_loader import idm

        description = garment_description(garment)
        idm.load()
        try:
            result_image = idm.run(
                person_image_path,
                garment_image_path,
                mask_path,
                prompt=description,
                pose_image=pose_path,
                garment=garment,
            )
        finally:
            # Always release after a job on T4; reliability over warm cache.
            from models.model_manager import models

            models.release_after_stage("idm")

        buffer = BytesIO()
        result_image.save(buffer, format="PNG")
        result_id = assets.put(
            buffer.getvalue(),
            content_type="image/png",
            kind="tryon-result",
            metadata={
                "synthetic": False,
                "provider": self.name,
                "mask_provider": (mask or {}).get("provider"),
                "mask_kind": (mask or {}).get("mask_kind"),
                "pose_provider": (pose or {}).get("provider"),
            },
        )
        return {
            "output_asset_id": result_id,
            "generated_image_url": f"/v1/assets/{result_id}/content",
            "synthetic": False,
            "quality": {
                "passed": True,
                "notes": [
                    "idm_vton",
                    f"mask={(mask or {}).get('mask_kind') or (mask or {}).get('provider')}",
                ],
            },
            "provider": self.name,
            "version": self.version,
            "execution": "real",
        }


def person_segmentation_input(garment):
    """Drop garment-image geometry before person-image segmentation."""

    return replace(garment, bounding_box=None)


def _segmentation_provider():
    from models.model_manager import agnostic_mask_assets_present, sam2_weights_present

    if agnostic_mask_assets_present():
        return AgnosticMaskAdapter()
    if sam2_weights_present():
        return SAM2Adapter()
    raise ProviderUnavailable(
        "segmentation_unavailable",
        "Neither OpenPose/parsing agnostic-mask assets nor SAM2 weights are present.",
    )


def get_providers():
    if is_mock_mode():
        return {
            "garment": MockGarmentProvider(),
            "segmentation": MockSegmentationProvider(),
            "pose": MockPoseProvider(),
            "densepose": MockPoseProvider(),
            "tryon": MockTryOnProvider(),
        }
    return {
        "garment": FlorenceGarmentAdapter(),
        "segmentation": _segmentation_provider(),
        "pose": PoseAdapter(),
        "densepose": DensePoseAdapter(),
        "tryon": IDMAdapter(),
    }


__all__ = [
    "AgnosticMaskAdapter",
    "CrossImageBoundingBoxError",
    "DensePoseAdapter",
    "FlorenceGarmentAdapter",
    "IDMAdapter",
    "PoseAdapter",
    "SAM2Adapter",
    "get_providers",
    "person_segmentation_input",
]
