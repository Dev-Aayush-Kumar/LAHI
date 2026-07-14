from services.sam2.sam2_predictor import segment_garment


def generate_mask(image_path: str):

    result = segment_garment(image_path)

    return result