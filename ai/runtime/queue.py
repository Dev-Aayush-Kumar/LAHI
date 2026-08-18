from __future__ import annotations

import threading
from collections.abc import Callable
from typing import Any

from runtime.config import QUEUE_BACKEND
from runtime.logging import log_event


class QueueBackend:
    def enqueue(self, job_id: str, worker: Callable[[], None]) -> None:
        raise NotImplementedError

    def cancel(self, job_id: str) -> bool:
        return False


class InlineQueue(QueueBackend):
    def enqueue(self, job_id: str, worker: Callable[[], None]) -> None:
        log_event("info", "queue_inline_run", job_id=job_id)
        worker()


class ThreadQueue(QueueBackend):
    def __init__(self):
        self._cancelled: set[str] = set()

    def enqueue(self, job_id: str, worker: Callable[[], None]) -> None:
        def run():
            if job_id in self._cancelled:
                return
            worker()

        threading.Thread(target=run, daemon=True, name=f"lahi-job-{job_id}").start()

    def cancel(self, job_id: str) -> bool:
        self._cancelled.add(job_id)
        return True


_queue: QueueBackend | None = None


def get_queue() -> QueueBackend:
    global _queue
    if _queue is None:
        _queue = ThreadQueue() if QUEUE_BACKEND == "thread" else InlineQueue()
    return _queue


def reset_queue_for_tests(backend: QueueBackend | None = None) -> None:
    global _queue
    _queue = backend or InlineQueue()
