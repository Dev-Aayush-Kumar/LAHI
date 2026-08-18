import os
import tempfile
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image


MAX_IMAGE_BYTES = 15 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_VIDEO_BYTES = 250 * 1024 * 1024
ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}


async def save_image_upload(upload: UploadFile) -> str:
    suffix = ALLOWED_IMAGE_TYPES.get(upload.content_type or "")
    if suffix is None:
        raise HTTPException(
            status_code=415,
            detail="Only JPEG, PNG, and WebP images are supported.",
        )

    contents = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 15 MB size limit.",
        )

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix,
    ) as temporary:
        temporary.write(contents)
        return temporary.name


async def save_asset_upload(upload: UploadFile, *, asset_kind: str = "image") -> dict:
    """Persist a validated upload without accepting client-provided paths."""
    allowed_types = ALLOWED_IMAGE_TYPES if asset_kind == "image" else ALLOWED_VIDEO_TYPES
    max_bytes = MAX_IMAGE_BYTES if asset_kind == "image" else MAX_VIDEO_BYTES
    suffix = allowed_types.get(upload.content_type or "")
    if suffix is None:
        raise HTTPException(status_code=415, detail=f"Unsupported {asset_kind} upload type.")

    contents = await upload.read(max_bytes + 1)
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail=f"{asset_kind.title()} exceeds the size limit.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary:
        temporary.write(contents)
        path = temporary.name

    if asset_kind == "image":
        try:
            with Image.open(path) as image:
                image.verify()
        except Exception as exc:
            remove_temporary_file(path)
            raise HTTPException(status_code=415, detail="Uploaded file is not a valid image.") from exc

    return {
        "asset_id": f"upload_{Path(path).stem}",
        "filename": Path(upload.filename or "upload").name,
        "content_type": upload.content_type,
        "size_bytes": len(contents),
        "path": path,
    }


def remove_temporary_file(path: str) -> None:
    if os.path.exists(path):
        Path(path).unlink()
