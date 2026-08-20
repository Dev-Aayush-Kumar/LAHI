from services.garment_bbox import (
    CrossImageBoundingBoxError,
    build_florence_garment_schema,
    extract_florence_detection_box,
    parse_bounding_box,
)
from services.garment_schema import ProcessingStatus
from providers.registry import FlorenceGarmentAdapter


def test_parse_absolute_florence_box():
    box = parse_bounding_box(
        [10, 20, 110, 220],
        image_size=(200, 300),
        source_asset_ref="asset_garment",
    )
    assert box is not None
    assert box.to_list() == [10.0, 20.0, 110.0, 220.0]
    assert box.source_asset_ref == "asset_garment"
    assert box.image_width == 200
    assert box.image_height == 300


def test_parse_normalized_florence_box():
    box = parse_bounding_box(
        [0.1, 0.2, 0.8, 0.9],
        image_size=(100, 200),
        source_asset_ref="asset_garment",
    )
    assert box is not None
    assert box.to_list() == [10.0, 40.0, 80.0, 180.0]


def test_parse_dict_and_unordered_corners():
    box = parse_bounding_box(
        {"x_min": 80, "y_min": 90, "x_max": 10, "y_max": 20},
        image_size=(100, 100),
        source_asset_ref="asset_garment",
    )
    assert box is not None
    assert box.to_list() == [10.0, 20.0, 80.0, 90.0]


def test_parse_rejects_box_outside_image():
    try:
        parse_bounding_box([0, 0, 500, 20], image_size=(100, 100))
        raise AssertionError("expected CrossImageBoundingBoxError")
    except CrossImageBoundingBoxError:
        pass


def test_extract_open_vocabulary_detection_payload():
    box = extract_florence_detection_box(
        {
            "<OPEN_VOCABULARY_DETECTION>": {
                "bboxes": [[12, 16, 80, 90]],
                "labels": ["shirt"],
            }
        },
        image_size=(100, 120),
        source_asset_ref="asset_garment",
    )
    assert box is not None
    assert box.to_list() == [12.0, 16.0, 80.0, 90.0]
    assert box.source_asset_ref == "asset_garment"


def test_build_schema_uses_detection_box_and_caption_attributes():
    schema = build_florence_garment_schema(
        parsed={
            "garment_type": "shirt",
            "category": "topwear",
            "primary_color": "red",
            "confidence": 0.9,
            "model_name": "Florence-2-base",
        },
        detection={
            "<OPEN_VOCABULARY_DETECTION>": {
                "bboxes": [[5, 5, 40, 50]],
                "labels": ["shirt"],
            }
        },
        image_size=(64, 64),
        asset_id="asset_garment",
    )
    assert schema.processing_status == ProcessingStatus.COMPLETED
    assert schema.bounding_box is not None
    assert schema.bounding_box.to_list() == [5.0, 5.0, 40.0, 50.0]
    assert schema.bounding_box.source_asset_ref == "asset_garment"
    assert schema.garment_type == "shirt"
    assert schema.primary_color == "red"
    assert schema.error is None


def test_build_schema_is_partial_when_detection_has_no_box():
    schema = build_florence_garment_schema(
        parsed={"garment_type": "shirt", "confidence": 0.4},
        detection={"<OPEN_VOCABULARY_DETECTION>": {"bboxes": [], "labels": []}},
        image_size=(64, 64),
        asset_id="asset_garment",
    )
    assert schema.processing_status == ProcessingStatus.PARTIAL
    assert schema.bounding_box is None
    assert schema.error["code"] == "garment_bbox_unavailable"


def test_florence_adapter_parses_mocked_provider_responses(tmp_path, monkeypatch):
    from PIL import Image

    image_path = tmp_path / "garment.png"
    Image.new("RGB", (80, 100), "red").save(image_path)

    monkeypatch.setattr(
        "providers.registry._florence_outputs",
        lambda path: (
            {
                "parsed": {
                    "garment_type": "jacket",
                    "category": "outerwear",
                    "primary_color": "black",
                    "confidence": 0.81,
                }
            },
            {
                "<OPEN_VOCABULARY_DETECTION>": {
                    "bboxes": [[0.1, 0.1, 0.9, 0.9]],
                    "labels": ["jacket"],
                }
            },
        ),
    )

    schema = FlorenceGarmentAdapter().analyze(str(image_path), "asset_garment")
    assert schema.processing_status == ProcessingStatus.COMPLETED
    assert schema.bounding_box is not None
    assert schema.bounding_box.source_asset_ref == "asset_garment"
    assert schema.bounding_box.image_width == 80
    assert schema.bounding_box.image_height == 100
    assert schema.bounding_box.to_list() == [8.0, 10.0, 72.0, 90.0]
    assert schema.garment_type == "jacket"


def test_florence_adapter_partial_without_detection_box(tmp_path, monkeypatch):
    from PIL import Image

    image_path = tmp_path / "garment.png"
    Image.new("RGB", (40, 40), "blue").save(image_path)
    monkeypatch.setattr(
        "providers.registry._florence_outputs",
        lambda path: ({"parsed": {"garment_type": "shirt"}}, None),
    )
    schema = FlorenceGarmentAdapter().analyze(str(image_path), "asset_garment")
    assert schema.processing_status == ProcessingStatus.PARTIAL
    assert schema.bounding_box is None
    assert schema.error["code"] == "garment_bbox_unavailable"
