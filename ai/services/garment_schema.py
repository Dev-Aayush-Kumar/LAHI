"""Model-agnostic garment understanding contract.

This module deliberately contains data structures only.  A provider such as
Florence may populate them today, while another detector or VLM can populate
the same contract later without changing SAM2 or the try-on pipeline.
"""

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Optional


class ProcessingStatus(str, Enum):
    """Lifecycle state of a garment understanding request."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


@dataclass(frozen=True)
class BoundingBox:
    """Pixel-space, top-left-origin bounding box."""

    x_min: float
    y_min: float
    x_max: float
    y_max: float

    def __post_init__(self):
        if self.x_min < 0 or self.y_min < 0:
            raise ValueError("Bounding-box minimum coordinates cannot be negative.")
        if self.x_max < self.x_min or self.y_max < self.y_min:
            raise ValueError("Bounding-box maximum coordinates must be ordered.")

    def to_list(self) -> list[float]:
        return [self.x_min, self.y_min, self.x_max, self.y_max]


@dataclass
class GarmentSchema:
    """Stable output shared by garment-understanding model adapters."""

    garment_type: Optional[str] = None
    category: Optional[str] = None
    bounding_box: Optional[BoundingBox] = None
    confidence: Optional[float] = None

    # Extensible normalized attributes.  Existing first-class fields remain
    # for backwards compatibility with the caption endpoint and parser.
    attributes: dict[str, Any] = field(default_factory=dict)
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    fabric: Optional[str] = None
    pattern: Optional[str] = None
    sleeve: Optional[str] = None
    fit: Optional[str] = None
    style: Optional[str] = None
    occasion: Optional[str] = None
    gender: Optional[str] = None
    season: Optional[str] = None

    source_asset_ref: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    processing_status: ProcessingStatus = ProcessingStatus.PENDING
    error: Optional[dict[str, Any]] = None

    def __post_init__(self):
        if self.confidence is not None and not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1.")

    def to_dict(self) -> dict[str, Any]:
        """Return JSON-safe data for APIs and downstream pipeline stages."""

        result = asdict(self)
        result["processing_status"] = self.processing_status.value
        if self.bounding_box is not None:
            result["bounding_box"] = self.bounding_box.to_list()
        return result


# Semantic name for new integrations; retain GarmentSchema for existing code.
GarmentUnderstanding = GarmentSchema