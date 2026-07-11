from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

import os
import tempfile

from preprocessing.frame_loader import validate_image
from models.pose import detect_pose

router = APIRouter(
    prefix="/pose",
    tags=["Pose"]
)


@router.get("/health")
def health():
    return {
        "message": "Pose service ready"
    }


@router.post("/detect")
async def detect(
    image: UploadFile = File(...)
):
    suffix = os.path.splitext(image.filename)[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    ) as temp:

        temp.write(await image.read())

        temp_path = temp.name

    try:
        validate_image(temp_path)

        landmarks = detect_pose(temp_path)

        return {
            "success": True,
            "detected": landmarks is not None,
            "landmarks": landmarks
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)