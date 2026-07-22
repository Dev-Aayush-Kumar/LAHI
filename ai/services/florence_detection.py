from PIL import Image
import numpy as np

from services.florence_loader import florence


PROMPT = "<OPEN_VOCABULARY_DETECTION>"


def detect_garment(image_path: str):

    image = Image.open(image_path).convert("RGB")

    inputs = florence.processor(
        text=PROMPT,
        images=image,
        return_tensors="pt"
    )

    generated_ids = florence.model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=256,
        num_beams=3
    )

    generated_text = florence.processor.batch_decode(
        generated_ids,
        skip_special_tokens=False
    )[0]

    result = florence.processor.post_process_generation(
        generated_text,
        task=PROMPT,
        image_size=image.size
    )

    detections = result[PROMPT]

    print("\n===== DETECTIONS =====")
    print(detections)
    print("======================\n")

    boxes = detections["bboxes"]

    if len(boxes) == 0:
        return None
    return np.array(boxes[0], dtype=np.float32)