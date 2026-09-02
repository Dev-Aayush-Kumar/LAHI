from __future__ import annotations

from typing import Any

from api.remote_contracts import DiagnosticModel, ErrorInfo
from providers.registry import get_providers, person_segmentation_input
from runtime.config import is_mock_mode
from runtime.jobs import JobCancelled, checkpoint_job, update_job
from runtime.logging import log_event
from runtime.provider_errors import ProviderUnavailable
from runtime.storage import assets
from runtime.vram import stage


def _quality_check(result: dict[str, Any]) -> dict[str, Any]:
    if result.get("synthetic"):
        result.setdefault("quality", {})
        result["quality"]["passed"] = True
        result["quality"]["notes"] = ["synthetic_mock_output"]
        return result
    result.setdefault("quality", {"passed": True, "notes": []})
    return result


def _fail_job(request_id: str, code: str, message: str) -> None:
    log_event("error", "tryon_failed", request_id=request_id, code=code)
    update_job(
        request_id,
        status="failed",
        progress=100,
        error=ErrorInfo(code=code, message=message),
    )


def _release(name: str) -> None:
    if is_mock_mode():
        return
    from models.model_manager import models

    models.release_after_stage(name)


def run_tryon_job(request_id: str, person_asset: str, garment_asset: str) -> None:
    providers = get_providers()
    try:
        checkpoint_job(request_id, status="processing", progress=10)
        person_path = assets.path_for_provider(person_asset)
        garment_path = assets.path_for_provider(garment_asset)

        checkpoint_job(request_id, progress=20)
        with stage(request_id, "garment_understanding"):
            garment = providers["garment"].analyze(garment_path, garment_asset)
        _release("florence")

        checkpoint_job(request_id, progress=40)
        with stage(request_id, "segmentation"):
            mask = providers["segmentation"].segment(
                person_path,
                person_segmentation_input(garment),
                person_asset,
            )
        _release("sam2")
        _release("openpose")

        # MediaPipe landmarks are diagnostic only; IDM-VTON needs DensePose.
        checkpoint_job(request_id, progress=55)
        with stage(request_id, "pose"):
            pose = providers["pose"].detect(person_path, person_asset)

        checkpoint_job(request_id, progress=65)
        with stage(request_id, "densepose"):
            densepose = providers["densepose"].detect(person_path, person_asset)
        _release("densepose")

        checkpoint_job(request_id, progress=80)
        with stage(request_id, "tryon"):
            generated = providers["tryon"].generate(
                person_path,
                garment_path,
                garment,
                mask,
                densepose,
            )
        _release("idm")
        generated = _quality_check(generated)
        if not is_mock_mode() and generated.get("synthetic"):
            raise ProviderUnavailable(
                "unexpected_synthetic",
                "GPU mode produced a synthetic result. Refusing to mark the job completed.",
            )
        if not is_mock_mode():
            generated["execution"] = "real"
        generated["garment"] = garment.to_dict()
        generated["mask"] = {
            key: value for key, value in mask.items() if "path" not in key
        }
        generated["pose"] = pose
        generated["densepose"] = {
            key: value for key, value in densepose.items() if "path" not in key
        }
        generated["output_asset_ids"] = [
            item
            for item in [
                generated.get("output_asset_id"),
                mask.get("mask_asset_id"),
                densepose.get("pose_asset_id"),
            ]
            if item
        ]

        checkpoint_job(
            request_id,
            status="completed",
            progress=100,
            result=generated,
            model=DiagnosticModel(
                provider=generated.get("provider"),
                model=generated.get("provider"),
                version=generated.get("version"),
            ),
        )
        log_event("info", "tryon_completed", request_id=request_id)
    except JobCancelled:
        log_event("info", "tryon_cancelled", request_id=request_id)
    except ProviderUnavailable as error:
        _fail_job(request_id, error.code, error.message)
    except Exception as error:
        code = "tryon_failed"
        message = str(error)[:400] or "Try-on processing failed."
        lowered = message.lower()
        if "out of memory" in lowered or ("cuda" in lowered and "memory" in lowered):
            code = "gpu_oom"
            message = "GPU out of memory during try-on. Models were unloaded; retry on a clear T4."
        _fail_job(request_id, code, message)


def run_garment_job(request_id: str, asset_id: str) -> None:
    providers = get_providers()
    try:
        checkpoint_job(request_id, status="processing", progress=20)
        path = assets.path_for_provider(asset_id)
        with stage(request_id, "garment_understanding"):
            schema = providers["garment"].analyze(path, asset_id)
        _release("florence")
        checkpoint_job(
            request_id,
            status="completed",
            progress=100,
            result={
                "parsed": schema.to_dict(),
                "synthetic": schema.attributes.get("mock"),
            },
            model=DiagnosticModel(
                provider=schema.model_provider,
                model=schema.model_name,
                version=schema.model_version,
            ),
        )
    except JobCancelled:
        log_event("info", "garment_cancelled", request_id=request_id)
    except ProviderUnavailable as error:
        update_job(
            request_id,
            status="failed",
            error=ErrorInfo(code=error.code, message=error.message),
        )
    except Exception as error:
        update_job(
            request_id,
            status="failed",
            error=ErrorInfo(
                code="inference_failed",
                message=str(error)[:400] or "Garment analysis failed.",
            ),
        )


def run_preprocessing_job(request_id: str, asset_id: str) -> None:
    providers = get_providers()
    try:
        checkpoint_job(request_id, status="processing", progress=25)
        path = assets.path_for_provider(asset_id)
        with stage(request_id, "pose"):
            pose = providers["pose"].detect(path, asset_id)
        checkpoint_job(request_id, progress=70)
        synthetic = bool(
            pose.get("availability") == "AVAILABLE_MOCK"
            or (isinstance(pose.get("landmarks"), dict) and pose["landmarks"].get("synthetic"))
        )
        checkpoint_job(
            request_id,
            status="completed",
            progress=100,
            result={
                "pose": pose,
                "synthetic": synthetic,
            },
            model=DiagnosticModel(
                provider=pose.get("provider"),
                model=pose.get("provider"),
                version=pose.get("version"),
            ),
        )
        log_event("info", "preprocessing_completed", request_id=request_id)
    except JobCancelled:
        log_event("info", "preprocessing_cancelled", request_id=request_id)
    except ProviderUnavailable as error:
        update_job(
            request_id,
            status="failed",
            error=ErrorInfo(code=error.code, message=error.message),
        )
    except Exception as error:
        update_job(
            request_id,
            status="failed",
            error=ErrorInfo(
                code="preprocessing_failed",
                message=str(error)[:400] or "Human preprocessing failed.",
            ),
        )
