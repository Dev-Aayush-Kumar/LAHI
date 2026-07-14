from fastapi import FastAPI
from services.sam2.sam2_loader import load_sam2
from api.pose import router as pose_router
from api.system import router as system_router

from services.florence_loader import florence

app = FastAPI(
    title="LAHI AI Backend",
    version="0.2.0"
)


@app.on_event("startup")
def startup():

    florence.load()
    load_sam2()


app.include_router(system_router)
app.include_router(pose_router)


@app.get("/")
def root():

    return {
        "status": "running",
        "service": "LAHI AI Backend"
    }