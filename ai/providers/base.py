from typing import Any, Protocol

from services.garment_schema import GarmentSchema


class GarmentUnderstandingProvider(Protocol):
    name: str
    version: str

    def analyze(self, image_path: str, asset_id: str | None = None) -> GarmentSchema:
        ...


class SegmentationProvider(Protocol):
    name: str
    version: str

    def segment(
        self,
        image_path: str,
        garment: GarmentSchema,
        asset_id: str | None = None,
    ) -> dict[str, Any]:
        ...


class PoseProvider(Protocol):
    name: str
    version: str

    def detect(self, image_path: str, asset_id: str | None = None) -> dict[str, Any]:
        ...


class TryOnProvider(Protocol):
    name: str
    version: str

    def generate(
        self,
        person_image_path: str,
        garment_image_path: str,
        garment: GarmentSchema,
        mask: dict[str, Any] | None,
        pose: dict[str, Any] | None,
    ) -> dict[str, Any]:
        ...
