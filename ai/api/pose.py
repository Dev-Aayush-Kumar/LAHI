from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

from api.upload_utils import remove_temporary_file, save_image_upload
from models.model_manager import POSE_MODEL

router = APIRouter(
    prefix="/pose",
    tags=["Pose"]
)


@router.get("/health")
def health():
    if not POSE_MODEL.exists():
        raise HTTPException(
            status_code=503,
            detail="Pose model is unavailable.",
        )
    return {
        "status": "ready",
        "message": "Pose service ready",
    }


@router.post("/detect")
async def detect(
    image: UploadFile = File(...)
):
    from models.pose import detect_pose


    temp_path = await save_image_upload(image)


    try:

        from preprocessing.frame_loader import validate_image

        validate_image(temp_path)

        result = detect_pose(temp_path)

        if result is None:

            return {
                "success": True,
                "detected": False,
                "orientation": None,
                "confidence": 0.0,
                "landmarks": None
            }

        return {
            "success": True,
            "detected": True,
            **result
        }

    except Exception as e:
        print(f"Pose detection failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Pose detection failed.",
        ) from e

    finally:

        remove_temporary_file(temp_path)