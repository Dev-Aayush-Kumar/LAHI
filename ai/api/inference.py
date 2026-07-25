from fastapi import APIRouter

router = APIRouter(
    prefix="/inference",
    tags=["Inference"],
)


@router.post("/tryon")
async def tryon():
    return {
        "success": True,
        "message": "Pipeline connected"
    }