import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("lahi.ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

SENSITIVE = {"password", "token", "authorization", "secret", "api_key"}


def log_event(level: str, message: str, **fields) -> None:
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "message": message,
    }
    for key, value in fields.items():
        payload[key] = "[redacted]" if key.lower() in SENSITIVE else value
    getattr(logger, level if level in {"info", "warning", "error"} else "info")(
        json.dumps(payload)
    )
