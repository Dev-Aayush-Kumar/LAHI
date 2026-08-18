from PIL import Image
import numpy as np
import torch

from loaders.florence_loader import florence
from models.model_manager import DEVICE
from models.model_manager import FLORENCE_MODEL
from services.garment_schema import BoundingBox
from services.garment_schema import GarmentSchema
from services.garment_schema import ProcessingStatus

TASK = "<OPEN_VOCABULARY_DETECTION>"
DEFAULT_QUERY = "garment"


def detect_garment(
    image_path: str,
    garment_query: str = DEFAULT_QUERY,
):
    """Detect a generalized apparel region for downstream segmentation.

    The query is injectable so a catalog-aware caller can request a specific
    garment type without coupling SAM2 to Florence or to one apparel class.
    """

    if florence.model is None:
        florence.load()

    image = Image.open(image_path).convert("RGB")

    prompt = f"{TASK} {garment_query}"

    inputs = florence.processor(
        text=prompt,
        images=image,
        return_tensors="pt",
    )

    inputs = {
        k: v.to(DEVICE)
        for k, v in inputs.items()
    }

    with torch.inference_mode():

        generated_ids = florence.model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=256,
            num_beams=3,
        )

    generated_text = florence.processor.batch_decode(
        generated_ids,
        skip_special_tokens=False,
    )[0]

    print("\n========== GENERATED TEXT ==========")
    print(generated_text)

    result = florence.processor.post_process_generation(
        generated_text,
        task=TASK,
        image_size=image.size,
    )

    print("\n========== RESULT ==========")
    print(result)

    detections = result[TASK]

    print("\n========== LABELS ==========")
    print(detections.get("labels"))

    print("\n========== BBOXES ==========")
    print(detections.get("bboxes"))

    boxes = detections.get("bboxes", [])

    if len(boxes) == 0:
        return GarmentSchema(
            source_asset_ref=image_path,
            model_provider="microsoft",
            model_name=FLORENCE_MODEL,
            processing_status=ProcessingStatus.PARTIAL,
            error={
                "code": "garment_not_detected",
                "message": "No garment region was detected.",
            },
        )

    box = np.array(boxes[0], dtype=np.float32)

    # Ensure proper order
    x1, y1, x2, y2 = box

    x1, x2 = sorted([x1, x2])
    y1, y2 = sorted([y1, y2])

    box = np.array([x1, y1, x2, y2], dtype=np.float32)

    print("\n========== FINAL BOX ==========")
    print(box)

    label = (detections.get("labels") or [garment_query])[0]
    return GarmentSchema(
        garment_type=label,
        category="apparel",
        bounding_box=BoundingBox(*box.tolist()),
        source_asset_ref=image_path,
        model_provider="microsoft",
        model_name=FLORENCE_MODEL,
        processing_status=ProcessingStatus.COMPLETED,
    )