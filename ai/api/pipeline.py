from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File

import os
import tempfile

from services.pipeline import process_pipeline


router = APIRouter(
    prefix="/pipeline",
    tags=["Pipeline"]
)


@router.post("/process")
async def process(
    video: UploadFile = File(...)
):

    suffix = os.path.splitext(
        video.filename
    )[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    ) as temp:

        temp.write(
            await video.read()
        )

        video_path = temp.name

    try:

        return process_pipeline(
            video_path
        )

    finally:

        if os.path.exists(video_path):
            os.remove(video_path)