from PIL import Image

from services.sam2.sam2_loader import load_sam2


def segment_garment(image_path: str):

    load_sam2()

    image = Image.open(image_path).convert("RGB")

    width, height = image.size

    return {

        "width": width,

        "height": height,

        "mask": None

    }