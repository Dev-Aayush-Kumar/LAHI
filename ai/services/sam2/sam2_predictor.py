import time
import numpy as np
from PIL import Image

from services.florence_detection import detect_garment
from services.sam2.sam2_loader import load_sam2


def segment_garment(image_path: str):

    total_start = time.time()

    predictor = load_sam2()

    image = Image.open(image_path).convert("RGB")
    image_np = np.array(image)

    # Florence Detection
    florence_start = time.time()

    box = detect_garment(image_path)

    print(f"Florence detection: {time.time() - florence_start:.2f}s")

    if box is None:

        return {

            "width": image.width,

            "height": image.height,

            "mask": None

        }

    # SAM2 Image Embedding
    sam_set_start = time.time()

    predictor.set_image(image_np)

    print(f"SAM2 set_image: {time.time() - sam_set_start:.2f}s")

    # SAM2 Prediction
    sam_predict_start = time.time()

    masks, scores, logits = predictor.predict(

        box=box,

        multimask_output=False

    )

    print(f"SAM2 predict: {time.time() - sam_predict_start:.2f}s")

    mask = masks[0].astype(np.uint8)

    print(f"TOTAL: {time.time() - total_start:.2f}s")

    return {

        "width": image.width,

        "height": image.height,

        "box": box.tolist(),

        "score": float(scores[0]),

        "mask": mask

    }