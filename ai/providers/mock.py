from io import BytesIO

from PIL import Image, ImageDraw

from services.garment_schema import BoundingBox, GarmentSchema, ProcessingStatus
from runtime.storage import assets


class MockGarmentProvider:
    name = "mock-garment"
    version = "dev-1"

    def analyze(self, image_path: str, asset_id: str | None = None) -> GarmentSchema:
        return GarmentSchema(
            garment_type="shirt",
            category="tops",
            bounding_box=BoundingBox(
                8,
                8,
                56,
                56,
                source_asset_ref=asset_id or image_path,
                image_width=64,
                image_height=64,
            ),
            confidence=0.42,
            attributes={"synthetic": True, "mock": True},
            primary_color="test-magenta",
            source_asset_ref=asset_id or image_path,
            model_provider=self.name,
            model_name="synthetic-garment-fixture",
            model_version=self.version,
            processing_status=ProcessingStatus.COMPLETED,
        )


class MockSegmentationProvider:
    name = "mock-sam"
    version = "dev-1"

    def segment(self, image_path: str, garment, asset_id: str | None = None):
        image = Image.new("L", (64, 64), 0)
        draw = ImageDraw.Draw(image)
        if garment.bounding_box:
            box = garment.bounding_box
            draw.rectangle(
                [int(box.x_min), int(box.y_min), int(box.x_max), int(box.y_max)],
                fill=255,
            )
        else:
            draw.rectangle([8, 8, 56, 56], fill=255)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        mask_id = assets.put(
            buffer.getvalue(),
            content_type="image/png",
            kind="mask",
            metadata={"synthetic": True, "provider": self.name},
        )
        return {
            "mask_asset_id": mask_id,
            "provider": self.name,
            "version": self.version,
            "synthetic": True,
        }


class MockPoseProvider:
    name = "mock-pose"
    version = "dev-1"

    def detect(self, image_path: str, asset_id: str | None = None):
        return {
            "detected": True,
            "orientation": "front",
            "confidence": 0.5,
            "landmarks": {"synthetic": True},
            "provider": self.name,
            "version": self.version,
            "availability": "AVAILABLE_MOCK",
        }


class MockTryOnProvider:
    name = "mock-tryon"
    version = "dev-1"

    def generate(
        self,
        person_image_path: str,
        garment_image_path: str,
        garment,
        mask,
        pose,
    ):
        image = Image.new("RGB", (512, 640), (240, 240, 245))
        draw = ImageDraw.Draw(image)
        draw.rectangle([16, 16, 496, 624], outline=(180, 0, 180), width=8)
        draw.text(
            (40, 80),
            "LAHI MOCK TRY-ON",
            fill=(180, 0, 180),
        )
        draw.text(
            (40, 120),
            "NOT A REAL CUSTOMER RESULT",
            fill=(40, 40, 40),
        )
        draw.text(
            (40, 160),
            f"garment={garment.garment_type or 'unknown'}",
            fill=(40, 40, 40),
        )
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        result_id = assets.put(
            buffer.getvalue(),
            content_type="image/png",
            kind="tryon-result",
            metadata={"synthetic": True, "provider": self.name},
        )
        return {
            "output_asset_id": result_id,
            "generated_image_url": f"/v1/assets/{result_id}/content",
            "synthetic": True,
            "quality": {"passed": True, "notes": ["mock_fixture"]},
            "provider": self.name,
            "version": self.version,
        }
