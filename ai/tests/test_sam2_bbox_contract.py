from PIL import Image

import pytest

from providers.registry import SAM2Adapter, person_segmentation_input
from services.garment_bbox import CrossImageBoundingBoxError
from services.garment_schema import BoundingBox, GarmentSchema


def _png(path, size=(80, 120), color="blue"):
    Image.new("RGB", size, color).save(path)
    return str(path)


def test_sam2_rejects_garment_bbox_on_person_image(tmp_path, monkeypatch):
    person_path = _png(tmp_path / "person.png", (80, 120), "blue")
    garment = GarmentSchema(
        garment_type="shirt",
        bounding_box=BoundingBox(
            4,
            4,
            40,
            50,
            source_asset_ref="asset_garment",
            image_width=64,
            image_height=64,
        ),
        source_asset_ref="asset_garment",
    )

    def fail_segment(*_args, **_kwargs):
        raise AssertionError("SAM2 must not run with a cross-image bounding box")

    monkeypatch.setattr("services.sam2_segmentation.segment_person", fail_segment)

    with pytest.raises(CrossImageBoundingBoxError, match="asset_garment"):
        SAM2Adapter().segment(person_path, garment, "asset_person")


def test_sam2_rejects_bbox_when_only_schema_source_differs(tmp_path, monkeypatch):
    person_path = _png(tmp_path / "person.png", (90, 90), "green")
    garment = GarmentSchema(
        bounding_box=BoundingBox(1, 1, 10, 10),
        source_asset_ref="asset_garment",
    )
    monkeypatch.setattr(
        "services.sam2_segmentation.segment_person",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            AssertionError("should not segment")
        ),
    )
    with pytest.raises(CrossImageBoundingBoxError):
        SAM2Adapter().segment(person_path, garment, "asset_person")


def test_person_segmentation_input_strips_garment_geometry():
    garment = GarmentSchema(
        garment_type="shirt",
        bounding_box=BoundingBox(1, 1, 8, 8, source_asset_ref="asset_garment"),
        source_asset_ref="asset_garment",
    )
    person_input = person_segmentation_input(garment)
    assert person_input.bounding_box is None
    assert person_input.garment_type == "shirt"
    assert garment.bounding_box is not None


def test_sam2_independent_person_box_uses_person_image_size(tmp_path, monkeypatch):
    person_path = _png(tmp_path / "person.png", (80, 120), "blue")
    captured = {}

    def fake_segment(image_path, bbox):
        captured["image_path"] = image_path
        captured["bbox"] = list(bbox)
        return str(tmp_path / "mask.png")

    monkeypatch.setattr("services.sam2_segmentation.segment_person", fake_segment)
    result = SAM2Adapter().segment(
        person_path,
        person_segmentation_input(
            GarmentSchema(
                bounding_box=BoundingBox(2, 2, 20, 20, source_asset_ref="asset_garment"),
                source_asset_ref="asset_garment",
            )
        ),
        "asset_person",
    )
    assert captured["image_path"] == person_path
    assert captured["bbox"] == [0.0, 0.0, 79.0, 119.0]
    assert result["source_asset_id"] == "asset_person"
    assert result["image_size"] == [80, 120]


def test_sam2_accepts_bbox_for_matching_source_image(tmp_path, monkeypatch):
    garment_path = _png(tmp_path / "garment.png", (64, 64), "red")
    captured = {}
    monkeypatch.setattr(
        "services.sam2_segmentation.segment_person",
        lambda image_path, bbox: captured.update(
            image_path=image_path, bbox=list(bbox)
        )
        or "mask.png",
    )
    garment = GarmentSchema(
        bounding_box=BoundingBox(
            8,
            8,
            56,
            56,
            source_asset_ref="asset_garment",
            image_width=64,
            image_height=64,
        ),
        source_asset_ref="asset_garment",
    )
    SAM2Adapter().segment(garment_path, garment, "asset_garment")
    assert captured["bbox"] == [8.0, 8.0, 56.0, 56.0]
