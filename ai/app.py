from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from runtime.config import ALLOWED_ORIGINS


BASE_DIR = Path(__file__).resolve().parent


app = FastAPI(
    title="LAHI AI Backend",
    version="0.4.0"
)


UPLOADS_DIR = BASE_DIR / "public" / "uploads"
if UPLOADS_DIR.exists():
    app.mount(
        "/uploads",
        StaticFiles(directory=UPLOADS_DIR),
        name="uploads"
    )


# The AI service is intentionally independent from the commerce application.
# Models are loaded on demand; readiness reports whether the configured
# dependencies are actually available instead of making startup fail.
# Google Colab is one possible GPU worker, not a special runtime.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Provider modules are imported after app construction and perform inference
# only inside request handlers, so missing weights do not block API startup.
from api.inference import router as inference_router
from api.pipeline import router as pipeline_router
from api.pose import router as pose_router
from api.remote_service import router as remote_service_router
from api.system import router as system_router


app.include_router(system_router)
app.include_router(pose_router)
app.include_router(inference_router)
app.include_router(pipeline_router)
app.include_router(remote_service_router)

@app.get("/")
def root():

    return {
        "status": "running",
        "service": "LAHI AI Backend",
        "note": "Use /v1 as the stable integration contract.",
    }
