from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from api.remote_contracts import DiagnosticModel, ErrorInfo, JobResponse, TimingInfo

_LOCK = threading.Lock()
_JOBS: dict[str, JobResponse] = {}
_PROGRESS: dict[str, int] = {}


def create_job(
    operation: str,
    status: str = "queued",
    **kwargs: Any,
) -> JobResponse:
    now = datetime.now(timezone.utc)
    response = JobResponse(
        request_id=str(uuid4()),
        operation=operation,
        status=status,
        progress=kwargs.pop("progress", 0),
        timing=TimingInfo(started_at=now),
        **kwargs,
    )
    with _LOCK:
        _JOBS[response.request_id] = response
        _PROGRESS[response.request_id] = response.progress or 0
    return response


def get_job(request_id: str) -> JobResponse | None:
    with _LOCK:
        job = _JOBS.get(request_id)
        if job is None:
            return None
        job.progress = _PROGRESS.get(request_id, job.progress)
        return job


def update_job(
    request_id: str,
    *,
    status: str | None = None,
    progress: int | None = None,
    result: Any = None,
    error: ErrorInfo | None = None,
    model: DiagnosticModel | None = None,
) -> JobResponse | None:
    with _LOCK:
        job = _JOBS.get(request_id)
        if job is None:
            return None
        if status:
            job.status = status
        if progress is not None:
            job.progress = progress
            _PROGRESS[request_id] = progress
        if result is not None:
            job.result = result
        if error is not None:
            job.error = error
        if model is not None:
            job.model = model
        if status in {"completed", "failed", "cancelled"}:
            completed = datetime.now(timezone.utc)
            started = job.timing.started_at
            duration = (completed - started).total_seconds() * 1000
            job.timing.completed_at = completed
            job.timing.duration_ms = round(duration, 2)
        return job


def mark_timing_start(request_id: str) -> float:
    return time.perf_counter()
