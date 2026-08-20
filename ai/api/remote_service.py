"""Authenticated API boundary used by local LAHI applications and GPU hosts."""

import hmac
import os
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.remote_contracts import (
    Capability,
    CapabilityResponse,
    DiagnosticModel,
    ErrorInfo,
    JobCreateRequest,
    JobResponse,
)
from api.upload_utils import save_asset_upload
from models.model_manager import models
from pipelines.orchestrator import run_garment_job, run_preprocessing_job, run_tryon_job
from runtime.config import execution_mode, is_mock_mode
from runtime.jobs import create_job, get_job, update_job
from runtime.logging import log_event
from runtime.queue import get_queue
from runtime.storage import assets


router = APIRouter(prefix="/v1", tags=["AI Service"])
bearer = HTTPBearer(auto_error=False)


def require_service_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> None:
    expected = os.getenv("AI_SERVER_TOKEN", "").strip()
    supplied = credentials.credentials if credentials else ""
    if not expected or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Authentication required.")


@router.get("/health")
def service_health():
    return {
        "status": "healthy",
        "service": "LAHI AI service",
        "execution_mode": execution_mode(),
    }


@router.get("/readiness", dependencies=[Depends(require_service_token)])
def service_readiness():
    status = models.info()
    ready = is_mock_mode() or status["ready"]
    return {
        "status": "ready" if ready else "not_ready",
        "execution_mode": execution_mode(),
        "checks": status,
    }


@router.get(
    "/capabilities",
    response_model=CapabilityResponse,
    dependencies=[Depends(require_service_token)],
)
def capabilities():
    status = models.info()
    mock = is_mock_mode()
    return CapabilityResponse(
        execution_mode=execution_mode(),
        capabilities=[
            Capability(
                name="garment_analysis",
                available=True,
                ready=mock or status["florence"]["loaded"],
                model=DiagnosticModel(
                    provider="mock-garment" if mock else "florence",
                    model=status["florence"]["model"],
                    status=status["florence"].get("status"),
                    device=status.get("device"),
                    capabilities=["garment_schema"],
                ),
            ),
            Capability(
                name="human_preprocessing",
                available=True,
                ready=mock or status["pose"]["weights"],
                model=DiagnosticModel(provider="mock-pose" if mock else "pose"),
            ),
            Capability(
                name="virtual_try_on",
                available=True,
                ready=mock or status["idm"]["loaded"],
                model=DiagnosticModel(provider="mock-tryon" if mock else "idm-vton"),
            ),
        ],
    )


@router.post("/assets", dependencies=[Depends(require_service_token)])
async def upload_asset(
    file: UploadFile = File(...),
    kind: str = Form("image"),
):
    saved = await save_asset_upload(
        file,
        asset_kind="video" if kind == "video" else "image",
    )
    asset_id = assets.put(
        PathBytes(saved["path"]),
        content_type=saved["content_type"] or "application/octet-stream",
        kind=kind,
    )
    from api.upload_utils import remove_temporary_file

    remove_temporary_file(saved["path"])
    return {"asset_id": asset_id, "content_type": saved["content_type"]}


def PathBytes(path: str) -> bytes:
    from pathlib import Path

    return Path(path).read_bytes()


@router.get("/assets/{asset_id}/content", dependencies=[Depends(require_service_token)])
def get_asset_content(asset_id: str):
    meta = assets.meta(asset_id)
    return Response(content=assets.get(asset_id), media_type=meta["content_type"])


@router.post(
    "/jobs",
    response_model=JobResponse,
    dependencies=[Depends(require_service_token)],
)
def create_remote_job(request: JobCreateRequest):
    job = create_job(request.operation, "queued")
    queue = get_queue()
    asset_ids = [item.asset_id for item in request.assets]
    log_event(
        "info",
        "job_created",
        request_id=job.request_id,
        operation=request.operation,
    )

    if request.operation == "virtual_try_on":
        person = asset_ids[0]
        garment = asset_ids[1] if len(asset_ids) > 1 else asset_ids[0]

        def worker():
            run_tryon_job(job.request_id, person, garment)

        if request.asynchronous:
            queue.enqueue(job.request_id, worker)
        else:
            worker()
        return get_job(job.request_id) or job

    if request.operation == "garment_analysis":
        def worker():
            run_garment_job(job.request_id, asset_ids[0])

        if request.asynchronous:
            queue.enqueue(job.request_id, worker)
        else:
            worker()
        return get_job(job.request_id) or job

    if request.operation == "human_preprocessing":
        def worker():
            run_preprocessing_job(job.request_id, asset_ids[0])

        if request.asynchronous:
            queue.enqueue(job.request_id, worker)
        else:
            worker()
        return get_job(job.request_id) or job

    raise HTTPException(
        status_code=501,
        detail="This operation is not implemented in the current development server.",
    )


@router.get(
    "/jobs/{request_id}",
    response_model=JobResponse,
    dependencies=[Depends(require_service_token)],
)
def get_remote_job(request_id: str):
    job = get_job(request_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.post(
    "/jobs/{request_id}/cancel",
    response_model=JobResponse,
    dependencies=[Depends(require_service_token)],
)
def cancel_remote_job(request_id: str):
    job = get_job(request_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status in {"completed", "failed", "cancelled"}:
        return job
    get_queue().cancel(request_id)
    updated = update_job(request_id, status="cancelled", progress=job.progress or 0)
    return updated or job


@router.post(
    "/garments/analyze",
    response_model=JobResponse,
    dependencies=[Depends(require_service_token)],
)
async def analyze_garment(
    image: UploadFile = File(...),
    asynchronous: bool = Query(False),
):
    saved = await save_asset_upload(image)
    from api.upload_utils import remove_temporary_file

    asset_id = assets.put(
        PathBytes(saved["path"]),
        content_type=saved["content_type"] or "image/png",
        kind="garment",
    )
    remove_temporary_file(saved["path"])
    job = create_job("garment_analysis", "queued")
    if asynchronous:
        get_queue().enqueue(job.request_id, lambda: run_garment_job(job.request_id, asset_id))
        return get_job(job.request_id) or job
    run_garment_job(job.request_id, asset_id)
    return get_job(job.request_id) or job
