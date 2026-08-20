"""Bounding-box parsing, source identity, and cross-image guards.

Coordinates are never silently scaled or copied from one asset onto another.
"""

from __future__ import annotations

from typing import Any, Optional

from services.garment_schema import BoundingBox, GarmentSchema, ProcessingStatus


class CrossImageBoundingBoxError(ValueError):
    """Raised when a box from one image is applied to a different image."""


FLORENCE_DETECTION_TASK = "<OPEN_VOCABULARY_DETECTION>"


def parse_bounding_box(
    raw: Any,
    *,
    image_size: tuple[int, int],
    source_asset_ref: str | None = None,
) -> BoundingBox | None:
    """Normalize Florence/provider boxes into pixel-space BoundingBox.

    Accepts a 4-sequence, a dict, or an existing BoundingBox. Values in
    ``[0, 1]`` on an image larger than 1px are treated as normalized and
    converted to pixels. Ordered corners are enforced. Incompatible or
    empty inputs return None rather than a guessed box.
    """

    if raw is None:
        return None

    if isinstance(raw, BoundingBox):
        coords = raw.to_list()
        source_asset_ref = source_asset_ref or raw.source_asset_ref
        image_width = raw.image_width or image_size[0]
        image_height = raw.image_height or image_size[1]
        if (image_width, image_height) != image_size:
            raise CrossImageBoundingBoxError(
                "Bounding box image size "
                f"{image_width}x{image_height} does not match "
                f"{image_size[0]}x{image_size[1]}."
            )
        raw = coords

    values = _coerce_box_values(raw)
    if values is None:
        return None

    width, height = image_size
    if width <= 0 or height <= 0:
        return None

    x_min, y_min, x_max, y_max = values
    if _looks_normalized(values, width, height):
        x_min *= width
        x_max *= width
        y_min *= height
        y_max *= height

    x_min, x_max = sorted((float(x_min), float(x_max)))
    y_min, y_max = sorted((float(y_min), float(y_max)))

    if x_max < x_min or y_max < y_min:
        return None
    if x_max > width or y_max > height or x_min < 0 or y_min < 0:
        raise CrossImageBoundingBoxError(
            "Bounding box extends outside the source image "
            f"{width}x{height}: {[x_min, y_min, x_max, y_max]}."
        )

    return BoundingBox(
        x_min=x_min,
        y_min=y_min,
        x_max=x_max,
        y_max=y_max,
        source_asset_ref=source_asset_ref,
        image_width=width,
        image_height=height,
    )


def extract_florence_detection_box(
    result: Any,
    *,
    image_size: tuple[int, int],
    source_asset_ref: str | None = None,
) -> BoundingBox | None:
    """Parse a Florence open-vocabulary detection payload for one garment box."""

    if result is None:
        return None

    if isinstance(result, GarmentSchema):
        return parse_bounding_box(
            result.bounding_box,
            image_size=image_size,
            source_asset_ref=source_asset_ref or result.source_asset_ref,
        )

    payload = result
    if isinstance(result, dict) and FLORENCE_DETECTION_TASK in result:
        payload = result[FLORENCE_DETECTION_TASK]

    if not isinstance(payload, dict):
        return parse_bounding_box(
            payload,
            image_size=image_size,
            source_asset_ref=source_asset_ref,
        )

    boxes = payload.get("bboxes") or payload.get("bounding_boxes") or payload.get("bounding_box")
    if isinstance(boxes, list) and boxes and not _is_flat_box(boxes):
        return parse_bounding_box(
            boxes[0],
            image_size=image_size,
            source_asset_ref=source_asset_ref,
        )
    return parse_bounding_box(
        boxes,
        image_size=image_size,
        source_asset_ref=source_asset_ref,
    )


def bbox_source_asset(garment: GarmentSchema) -> str | None:
    if garment.bounding_box and garment.bounding_box.source_asset_ref:
        return garment.bounding_box.source_asset_ref
    return garment.source_asset_ref


def assert_bbox_matches_image(
    garment: GarmentSchema,
    *,
    asset_id: str | None,
    image_size: tuple[int, int],
) -> BoundingBox:
    """Require that a garment box belongs to the image about to be segmented."""

    if garment.bounding_box is None:
        raise CrossImageBoundingBoxError("No bounding box is available.")

    box = garment.bounding_box
    source = bbox_source_asset(garment)
    if source and asset_id and source != asset_id:
        raise CrossImageBoundingBoxError(
            f"Bounding box belongs to asset {source!r}, not {asset_id!r}."
        )
    if not source and asset_id:
        raise CrossImageBoundingBoxError(
            "Bounding box is missing source asset identity and cannot be "
            f"applied to {asset_id!r}."
        )

    width, height = image_size
    if box.image_width is not None and box.image_width != width:
        raise CrossImageBoundingBoxError(
            "Bounding box image width "
            f"{box.image_width} does not match source image width {width}."
        )
    if box.image_height is not None and box.image_height != height:
        raise CrossImageBoundingBoxError(
            "Bounding box image height "
            f"{box.image_height} does not match source image height {height}."
        )
    if box.x_max > width or box.y_max > height:
        raise CrossImageBoundingBoxError(
            "Bounding box extends outside the source image "
            f"{width}x{height}: {box.to_list()}."
        )
    return box


def build_florence_garment_schema(
    *,
    parsed: dict[str, Any] | None,
    detection: Any = None,
    image_size: tuple[int, int],
    asset_id: str | None = None,
    model_name: str | None = None,
) -> GarmentSchema:
    """Combine caption attributes with detection geometry into GarmentSchema."""

    parsed = dict(parsed or {})
    parsed_box = parsed.pop("bounding_box", None)
    parsed.pop("processing_status", None)
    parsed.pop("error", None)
    parsed.pop("source_asset_ref", None)

    attributes = parsed.get("attributes") or {}
    if not isinstance(attributes, dict):
        attributes = {}
    parsed["attributes"] = attributes

    schema = GarmentSchema(
        garment_type=parsed.get("garment_type"),
        category=parsed.get("category"),
        confidence=_clamp_confidence(parsed.get("confidence")),
        attributes=attributes,
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
        model_name=model_name or parsed.get("model_name"),
        model_version=parsed.get("model_version"),
        processing_status=ProcessingStatus.COMPLETED,
    )

    box = parse_bounding_box(
        parsed_box,
        image_size=image_size,
        source_asset_ref=asset_id,
    )
    if box is None:
        box = extract_florence_detection_box(
            detection,
            image_size=image_size,
            source_asset_ref=asset_id,
        )

    if box is not None:
        schema.bounding_box = BoundingBox(
            box.x_min,
            box.y_min,
            box.x_max,
            box.y_max,
            source_asset_ref=asset_id or box.source_asset_ref,
            image_width=image_size[0],
            image_height=image_size[1],
        )
        if isinstance(detection, GarmentSchema) and detection.garment_type and not schema.garment_type:
            schema.garment_type = detection.garment_type
        schema.processing_status = ProcessingStatus.COMPLETED
        return schema

    schema.processing_status = ProcessingStatus.PARTIAL
    schema.error = {
        "code": "garment_bbox_unavailable",
        "message": "Garment detection did not produce a bounding box.",
    }
    return schema


def _coerce_box_values(raw: Any) -> Optional[tuple[float, float, float, float]]:
    if isinstance(raw, dict):
        try:
            return (
                float(raw["x_min"]),
                float(raw["y_min"]),
                float(raw["x_max"]),
                float(raw["y_max"]),
            )
        except (KeyError, TypeError, ValueError):
            return None
    if not isinstance(raw, (list, tuple)) or len(raw) != 4:
        return None
    try:
        return tuple(float(item) for item in raw)  # type: ignore[return-value]
    except (TypeError, ValueError):
        return None


def _is_flat_box(values: list[Any]) -> bool:
    return len(values) == 4 and all(isinstance(item, (int, float)) for item in values)


def _looks_normalized(values: tuple[float, float, float, float], width: int, height: int) -> bool:
    return width > 1 and height > 1 and max(values) <= 1.0 and min(values) >= 0.0


def _clamp_confidence(value: Any) -> float | None:
    if value is None:
        return None
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return None
    if confidence < 0 or confidence > 1:
        return None
    return confidence
