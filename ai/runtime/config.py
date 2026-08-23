import os
from pathlib import Path


def _load_env_file() -> None:
    """Apply ai/.env without overwriting a process or Colab-provided environment."""

    path = Path(__file__).resolve().parents[1] / ".env"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file()


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_ROOT = Path(env("AI_STORAGE_ROOT") or str(BASE_DIR / "var" / "assets"))
SERVER_TOKEN = env("AI_SERVER_TOKEN")
HOST = env("AI_HOST") or "0.0.0.0"
PORT = int(env("AI_PORT") or "8000")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in env(
        "AI_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]


def cors_wildcard() -> bool:
    return ALLOWED_ORIGINS == ["*"]


def execution_mode() -> str:
    return (env("AI_EXECUTION_MODE") or "mock").lower()


def queue_backend() -> str:
    return (env("AI_QUEUE_BACKEND") or "inline").lower()


def is_mock_mode() -> bool:
    return execution_mode() != "gpu"


def vram_budget_mb() -> int:
    raw = env("AI_VRAM_BUDGET_MB") or "15000"
    try:
        return max(int(raw), 1)
    except ValueError:
        return 15000
