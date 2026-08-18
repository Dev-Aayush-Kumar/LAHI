from runtime.jobs import create_job, get_job, update_job
from runtime.queue import InlineQueue
from api.remote_contracts import ErrorInfo


def test_job_lifecycle_and_idempotent_failure():
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
