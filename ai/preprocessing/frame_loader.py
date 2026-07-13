from PIL import Image


def validate_image(path: str):
    image = Image.open(path)

    image.verify()

    return path