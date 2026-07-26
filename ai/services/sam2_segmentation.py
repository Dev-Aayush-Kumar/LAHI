from pathlib import Path
import uuid

import numpy as np
from PIL import Image

from services.sam2_loader import sam


OUTPUT_DIR = (
    Path(__file__).resolve().parents[1]
    / "public"
    / "uploads"
    / "generated_masks"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


def segment_person(
    image_path: str,
    bbox: np.ndarray,
) -> str:
    """
    Generates a binary mask using SAM2.

    Args:
        image_path:
            Path to the input image.

        bbox:
            Florence bounding box
            [x1, y1, x2, y2]

    Returns:
        Absolute path of the generated binary mask.
    """

    if sam.predictor is None:
        sam.load()

    image = np.array(
        Image.open(image_path).convert("RGB")
    )
    print("Image shape:", image.shape)
    sam.predictor.set_image(image)
    print("set_image OK")
    box = np.asarray(
        bbox,
        dtype=np.float32,
    )
    print("Box:", box)
    masks, scores, logits = sam.predictor.predict(
        point_coords=None,
        point_labels=None,
        box=box,
        multimask_output=False,
    )
    print("predict OK")
    if masks is None or len(masks) == 0:
        raise RuntimeError(
            "SAM2 failed to generate any mask."
        )

    mask = (
        masks[0].astype(np.uint8)
        * 255
    )

    filename = f"{uuid.uuid4()}.png"

    output_path = OUTPUT_DIR / filename

    Image.fromarray(mask).save(output_path)

    return str(output_path)