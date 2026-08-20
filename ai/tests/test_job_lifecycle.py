import threading
import time

import pytest

from api.remote_contracts import ErrorInfo
from runtime.jobs import (
    JobCancelled,
    checkpoint_job,
    create_job,
    get_job,
    reset_jobs_for_tests,
    update_job,
)
from runtime.queue import InlineQueue, ThreadQueue


def test_job_lifecycle_and_idempotent_failure():
    reset_jobs_for_tests()
    job = create_job("virtual_try_on", "queued")
    assert get_job(job.request_id).status == "queued"

    update_job(job.request_id, status="processing", progress=40)
    assert get_job(job.request_id).progress == 40

    update_job(
        job.request_id,
        status="failed",
        error=ErrorInfo(code="tryon_failed", message="Try-on processing failed."),
    )
    failed = get_job(job.request_id)
    assert failed.status == "failed"
    assert failed.error.code == "tryon_failed"
    assert failed.timing.completed_at is not None


def test_inline_queue_runs_worker():
    seen = []
    queue = InlineQueue()
    queue.enqueue("job-1", lambda: seen.append("ran"))
    assert seen == ["ran"]


def test_cancelled_job_cannot_become_completed():
    reset_jobs_for_tests()
    job = create_job("virtual_try_on", "queued")
    update_job(job.request_id, status="processing")
    update_job(job.request_id, status="cancelled")
    update_job(job.request_id, status="completed", result={"ok": True}, progress=100)
    cancelled = get_job(job.request_id)
    assert cancelled.status == "cancelled"
    assert cancelled.result is None
    assert cancelled.progress != 100 or cancelled.status == "cancelled"


def test_completed_job_cannot_become_cancelled():
    reset_jobs_for_tests()
    job = create_job("virtual_try_on", "queued")
    update_job(job.request_id, status="processing")
    update_job(job.request_id, status="completed", result={"ok": True})
    update_job(job.request_id, status="cancelled")
    completed = get_job(job.request_id)
    assert completed.status == "completed"
    assert completed.result == {"ok": True}


def test_failed_job_cannot_become_completed():
    reset_jobs_for_tests()
    job = create_job("garment_analysis", "queued")
    update_job(job.request_id, status="failed", error=ErrorInfo(code="x", message="x"))
    update_job(job.request_id, status="completed", result={"ok": True})
    assert get_job(job.request_id).status == "failed"


def test_checkpoint_raises_when_cancelled():
    reset_jobs_for_tests()
    job = create_job("human_preprocessing", "queued")
    update_job(job.request_id, status="cancelled")
    with pytest.raises(JobCancelled):
        checkpoint_job(job.request_id, status="completed", result={"ok": True})
    assert get_job(job.request_id).status == "cancelled"


def test_inline_queue_skips_cancelled_job():
    seen = []
    queue = InlineQueue()
    queue.cancel("job-1")
    queue.enqueue("job-1", lambda: seen.append("ran"))
    assert seen == []


def test_running_worker_cannot_overwrite_cancelled_status():
    reset_jobs_for_tests()
    started = threading.Event()
    release = threading.Event()
    job = create_job("virtual_try_on", "queued")
    update_job(job.request_id, status="processing")

    def worker():
        started.set()
        assert release.wait(timeout=2)
        update_job(job.request_id, status="completed", result={"late": True})

    queue = ThreadQueue()
    queue.enqueue(job.request_id, worker)
    assert started.wait(timeout=2)
    queue.cancel(job.request_id)
    cancelled = update_job(job.request_id, status="cancelled")
    assert cancelled.status == "cancelled"
    release.set()
    time.sleep(0.2)
    final = get_job(job.request_id)
    assert final.status == "cancelled"
    assert final.result is None
