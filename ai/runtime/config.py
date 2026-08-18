import os
from pathlib import Path


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_ROOT = Path(env("AI_STORAGE_ROOT") or str(BASE_DIR / "var" / "assets"))
EXECUTION_MODE = (env("AI_EXECUTION_MODE") or "mock").lower()
QUEUE_BACKEND = (env("AI_QUEUE_BACKEND") or "inline").lower()
SERVER_TOKEN = env("AI_SERVER_TOKEN")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in env(
        "AI_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]


def is_mock_mode() -> bool:
    return EXECUTION_MODE != "gpu"
