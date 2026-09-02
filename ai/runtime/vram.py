from __future__ import annotations

from contextlib import contextmanager
from typing import Any

from runtime.logging import log_event


def snapshot() -> dict[str, Any]:
    try:
        import torch
    except ImportError:
        return {"cuda_available": False}

    if not torch.cuda.is_available():
        return {
            "cuda_available": False,
            "device": "cpu",
        }

    index = torch.cuda.current_device()
    allocated = int(torch.cuda.memory_allocated(index) / (1024 * 1024))
    reserved = int(torch.cuda.memory_reserved(index) / (1024 * 1024))
    total = int(torch.cuda.get_device_properties(index).total_memory / (1024 * 1024))
    info = {
        "cuda_available": True,
        "device": "cuda",
        "gpu_name": torch.cuda.get_device_name(index),
        "vram_allocated_mb": allocated,
        "vram_reserved_mb": reserved,
        "vram_total_mb": total,
        "vram_free_mb": max(total - reserved, 0),
    }
    try:
        info["vram_peak_allocated_mb"] = int(
            torch.cuda.max_memory_allocated(index) / (1024 * 1024)
        )
        info["vram_peak_reserved_mb"] = int(
            torch.cuda.max_memory_reserved(index) / (1024 * 1024)
        )
    except Exception:
        pass
    return info


def empty_cache() -> None:
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        return


@contextmanager
def stage(request_id: str, name: str):
    before = snapshot()
    log_event(
        "info",
        "pipeline_stage_start",
        request_id=request_id,
        stage=name,
        vram=before,
    )
    try:
        yield before
    finally:
        after = snapshot()
        log_event(
            "info",
            "pipeline_stage_end",
            request_id=request_id,
            stage=name,
            vram=after,
        )
