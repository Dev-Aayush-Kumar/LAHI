from pathlib import Path


def process_tryon(
    person_image: str,
    garment_image: str,
):
    """
    Complete LAHI AI Pipeline

    Person Image
          ↓
    Florence Detection
          ↓
    SAM2 Segmentation
          ↓
    IDM-VTON
          ↓
    Generated Image
    """

    # TODO
    # Florence

    # TODO
    # SAM2

    # TODO
    # IDM-VTON

    generated_image = ""

    return {
        "generatedImageUrl": generated_image,
        "modelName": "IDM-VTON",
        "generationTimeMs": 0,
    }