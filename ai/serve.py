"""Start the AI /v1 service for local or remote GPU workers.

Binds to AI_HOST/AI_PORT (default 0.0.0.0:8000) so an HTTPS tunnel can reach it.
Does not load Florence, SAM2, or IDM-VTON at import time.
"""

import uvicorn

from runtime.config import HOST, PORT, SERVER_TOKEN, execution_mode


def main() -> None:
    if not SERVER_TOKEN:
        raise SystemExit("AI_SERVER_TOKEN is required before serving /v1.")
    print(
        f"Starting LAHI AI service mode={execution_mode()} bind={HOST}:{PORT}",
        flush=True,
    )
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=False,
    )


if __name__ == "__main__":
    main()
