from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File

import os
import shutil
import tempfile

from services.tryon_pipeline import process_tryon

router = APIRouter(
    prefix="/pipeline",
    tags=["Pipeline"],
)


@router.post("/process")
async def process(
    person: UploadFile = File(...),
    garment: UploadFile = File(...),
):

    temp_dir = tempfile.mkdtemp()

    person_path = os.path.join(
        temp_dir,
        person.filename,
    )

    garment_path = os.path.join(
        temp_dir,
        garment.filename,
    )

    with open(person_path, "wb") as f:
        shutil.copyfileobj(
            person.file,
            f,
        )

    with open(garment_path, "wb") as f:
        shutil.copyfileobj(
            garment.file,
            f,
        )

    try:

        result = process_tryon(
            person_path,
            garment_path,
        )

        return {
            "success": True,
            **result,
        }

    finally:

        shutil.rmtree(
            temp_dir,
            ignore_errors=True,
        )