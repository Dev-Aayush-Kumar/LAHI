from fastapi import APIRouter, HTTPException
from fastapi import UploadFile
from fastapi import File
from api.upload_utils import remove_temporary_file, save_image_upload
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


@router.get("/ready")
def ready():
    status = models.info()
    if not status["ready"]:
        raise HTTPException(status_code=503, detail=status)
    return status
@router.post("/caption")
async def caption(
    image: UploadFile = File(...)
):
    from services.florence_caption import generate_caption


    path = await save_image_upload(image)

    try:

        return generate_caption(path)

    finally:

        remove_temporary_file(path)
@router.post("/mask")
async def mask(
    image: UploadFile = File(...)
):
    from services.sam2.mask_generator import generate_mask


    path = await save_image_upload(image)

    try:

        result = generate_mask(path)

        return result

    finally:

        remove_temporary_file(path)

@router.get("/models")
def model_status():

    return models.info()

@router.post("/pipeline")
async def pipeline(
    image: UploadFile = File(...)
):
    raise HTTPException(
        status_code=501,
        detail="The experimental image pipeline is not enabled.",
    )
