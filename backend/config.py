from pathlib import Path
import os
import torch

# ==========================================================
# Project Root
# ==========================================================

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

AI_DIR = PROJECT_ROOT / "ai"

# ==========================================================
# AI Directories
# ==========================================================

EXTERNAL_DIR = AI_DIR / "external"
WEIGHTS_DIR = AI_DIR / "weights"

# ---------- IDM-VTON ----------

IDM_DIR = EXTERNAL_DIR / "IDM-VTON"
IDM_CKPT_DIR = IDM_DIR / "ckpt"

# ---------- SAM2 ----------

SAM2_DIR = EXTERNAL_DIR / "sam2"

# (Optional future centralized weights)
SAM2_WEIGHTS_DIR = WEIGHTS_DIR / "sam2"

# ==========================================================
# Backend Directories
# ==========================================================

TEMP_DIR = BACKEND_DIR / "temp"
OUTPUT_DIR = BACKEND_DIR / "outputs"
LOG_DIR = BACKEND_DIR / "logs"

# ==========================================================
# Image Validation
# ==========================================================

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

MAX_IMAGE_SIZE_MB = 15

# ==========================================================
# Runtime
# ==========================================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

DEFAULT_WIDTH = 768
DEFAULT_HEIGHT = 1024

DEFAULT_STEPS = 30
GUIDANCE_SCALE = 2.0

# ==========================================================
# API
# ==========================================================

API_TITLE = "LAHI AI Backend"
API_VERSION = "1.0.0"

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]