from fastapi import APIRouter, HTTPException
from fastapi import UploadFile
from fastapi import File

from api.upload_utils import remove_temporary_file, save_image_upload

router = APIRouter(
    prefix="/pipeline",
    tags=["Pipeline"],
)


@router.post("/process")
async def process(
    person: UploadFile = File(...),
    garment: UploadFile = File(...),
):
    from pipelines.tryon_pipeline import process_tryon


    person_path = None
    garment_path = None

    try:
        person_path = await save_image_upload(person)
        garment_path = await save_image_upload(garment)

        result = process_tryon(
            person_path,
            garment_path,
        )

        if not result.get("generatedImageUrl"):
            raise HTTPException(
                status_code=501,
                detail="Virtual try-on inference is not implemented.",
            )

        return {
            "success": True,
            **result,
        }

    finally:
        if person_path:
            remove_temporary_file(person_path)
        if garment_path:
            remove_temporary_file(garment_path)