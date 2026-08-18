from pathlib import Path

from loguru import logger

from config import LOG_DIR

LOG_DIR.mkdir(parents=True, exist_ok=True)

logger.remove()

logger.add(
    LOG_DIR / "lahi.log",
    rotation="10 MB",
    retention="10 days",
    level="INFO",
    enqueue=True,
)

logger.add(
    sink=lambda msg: print(msg, end=""),
    level="INFO",
)

__all__ = ["logger"]