from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
import tempfile
import os
from services.sam2.mask_generator import generate_mask
from services.florence_caption import generate_caption
from models.model_manager import models

router = APIRouter(
    prefix="/system",
    tags=["System"]
)


@router.get("/health")
def health():

    return {
        "status": "ok",
        "service": "LAHI AI"
    }
@router.post("/caption")
async def caption(
    image: UploadFile = File(...)
):

    suffix = os.path.splitext(image.filename)[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    ) as temp:

        temp.write(await image.read())

        path = temp.name

    try:

        return generate_caption(path)

    finally:

        os.remove(path)
@router.post("/mask")
async def mask(
    image: UploadFile = File(...)
):

    suffix = os.path.splitext(image.filename)[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    ) as temp:

        temp.write(await image.read())

        path = temp.name

    try:

        result = generate_mask(path)

        return result

    finally:

        os.remove(path)

@router.get("/models")
def model_status():

    return models.info()