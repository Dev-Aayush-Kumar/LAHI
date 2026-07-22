from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from services.sam2.sam2_loader import load_sam2
from services.florence_loader import florence
from models.idm_loader import idm

from api.pose import router as pose_router
from api.system import router as system_router


BASE_DIR = Path(__file__).resolve().parent


app = FastAPI(
    title="LAHI AI Backend",
    version="0.2.0"
)


@app.on_event("startup")
def startup():

    florence.load()
    load_sam2()
    idm.load()


app.mount(
    "/uploads",
    StaticFiles(directory=BASE_DIR / "public" / "uploads"),
    name="uploads"
)


app.include_router(system_router)
app.include_router(pose_router)


@app.get("/")
def root():

    return {
        "status": "running",
        "service": "LAHI AI Backend"
    }