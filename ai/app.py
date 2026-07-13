from fastapi import FastAPI

from api.pose import router as pose_router

app = FastAPI(
    title="LAHI AI Backend",
    version="0.1.0"
)

app.include_router(pose_router)


@app.get("/")
def root():
    return {
        "status": "running",
        "service": "LAHI AI Backend"
    }