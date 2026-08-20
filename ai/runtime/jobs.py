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

TERMINAL_STATUSES = frozenset({"completed", "failed", "cancelled"})
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "pending": frozenset({"queued", "processing", "cancelled", "failed"}),
    "queued": frozenset({"processing", "cancelled", "failed"}),
    "processing": frozenset({"completed", "failed", "cancelled"}),
}


class JobCancelled(Exception):
    def __init__(self, request_id: str):
        super().__init__(f"Job {request_id} was cancelled.")
        self.request_id = request_id


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


def is_cancelled(request_id: str) -> bool:
    job = get_job(request_id)
    return job is not None and job.status == "cancelled"


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
        if job.status in TERMINAL_STATUSES:
            return job
        if status and status != job.status:
            allowed = ALLOWED_TRANSITIONS.get(job.status, frozenset())
            if status not in allowed:
                return job
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
        if job.status in TERMINAL_STATUSES:
            completed = datetime.now(timezone.utc)
            started = job.timing.started_at
            duration = (completed - started).total_seconds() * 1000
            job.timing.completed_at = completed
            job.timing.duration_ms = round(duration, 2)
        return job


def checkpoint_job(request_id: str, **kwargs: Any) -> JobResponse:
    """Update a job or raise if it was cancelled before/during the write."""

    if is_cancelled(request_id):
        raise JobCancelled(request_id)
    updated = update_job(request_id, **kwargs)
    if updated is None or updated.status == "cancelled":
        raise JobCancelled(request_id)
    return updated


def mark_timing_start(request_id: str) -> float:
    return time.perf_counter()


def reset_jobs_for_tests() -> None:
    with _LOCK:
        _JOBS.clear()
        _PROGRESS.clear()
