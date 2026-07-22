from pathlib import Path
import uuid

import numpy as np
from PIL import Image

from services.sam2.sam2_predictor import segment_garment


BASE = Path(__file__).resolve().parents[2]

OUTPUT_DIR = (
    BASE /
    "public" /
    "uploads" /
    "generated"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


def generate_mask(image_path: str):

    result = segment_garment(image_path)

    if result["mask"] is None:

        return result

    mask = result["mask"]

    if mask.dtype != np.uint8:
        mask = mask.astype(np.uint8)

    # -----------------------------
    # Save Binary Mask
    # -----------------------------

    binary_filename = f"{uuid.uuid4()}_mask.png"

    binary_path = OUTPUT_DIR / binary_filename

    Image.fromarray(mask * 255).save(binary_path)

    # -----------------------------
    # Create Transparent Garment PNG
    # -----------------------------

    original = Image.open(image_path).convert("RGBA")

    original_np = np.array(original)

    alpha = mask * 255

    original_np[:, :, 3] = alpha

    garment = Image.fromarray(original_np)

    garment_filename = f"{uuid.uuid4()}_garment.png"

    garment_path = OUTPUT_DIR / garment_filename

    garment.save(garment_path)

    return {

        "width": result["width"],

        "height": result["height"],

        "box": result["box"],

        "score": result["score"],

        "mask_url": f"/uploads/generated/{binary_filename}",

        "garment_url": f"/uploads/generated/{garment_filename}"

    }