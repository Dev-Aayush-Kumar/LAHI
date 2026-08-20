from pathlib import Path
import uuid

import numpy as np
from PIL import Image


OUTPUT_DIR = (
    Path(__file__).resolve().parents[1]
    / "public"
    / "uploads"
    / "generated_masks"
)


def segment_person(
    image_path: str,
    bbox: np.ndarray,
) -> str:
    """
    Generates a binary mask using SAM2.
    """
    from loaders.sam2_loader import sam
    from services.mask_refinement import refine_mask

    if sam.predictor is None:
        sam.load()

    image = np.array(
        Image.open(image_path).convert("RGB")
    )

    print("\n==============================")
    print("SAM2 DEBUG")
    print("==============================")
    print("Image shape :", image.shape)
    print("Image dtype :", image.dtype)

    sam.predictor.set_image(image)

    box = np.asarray(
        bbox,
        dtype=np.float32,
    )

    print("BBox :", box)
    print("BBox shape :", box.shape)
    print("BBox dtype :", box.dtype)
    print("==============================\n")

    masks, scores, logits = sam.predictor.predict(
        point_coords=None,
        point_labels=None,
        box=box,
        multimask_output=False,
    )

    print("Masks shape :", masks.shape)
    print("Scores :", scores)

    if masks is None or len(masks) == 0:
        raise RuntimeError(
            "SAM2 failed to generate any mask."
        )

    mask = (
        masks[0].astype(np.uint8)
        * 255
    )

    print("Mask shape :", mask.shape)
    print("Mask unique :", np.unique(mask))

    refined = refine_mask(mask)

    print("Refined unique :", np.unique(refined))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.png"
    output_path = OUTPUT_DIR / filename
    Image.fromarray(refined).save(output_path)

    print(f"\nMask saved: {output_path}\n")

    return str(output_path)
