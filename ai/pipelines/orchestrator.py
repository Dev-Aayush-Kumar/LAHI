from __future__ import annotations

from typing import Any

from api.remote_contracts import DiagnosticModel, ErrorInfo
from providers.registry import get_providers
from runtime.jobs import update_job
from runtime.logging import log_event
from runtime.storage import assets


def _quality_check(result: dict[str, Any]) -> dict[str, Any]:
    if result.get("synthetic"):
        result.setdefault("quality", {})
        result["quality"]["passed"] = True
        result["quality"]["notes"] = ["synthetic_mock_output"]
        return result
    result.setdefault("quality", {"passed": True, "notes": []})
    return result


def run_tryon_job(request_id: str, person_asset: str, garment_asset: str) -> None:
    providers = get_providers()
    try:
        update_job(request_id, status="processing", progress=10)
        person_path = assets.path_for_provider(person_asset)
        garment_path = assets.path_for_provider(garment_asset)

        update_job(request_id, progress=25)
        garment = providers["garment"].analyze(garment_path, garment_asset)

        update_job(request_id, progress=45)
        mask = providers["segmentation"].segment(person_path, garment, person_asset)

        update_job(request_id, progress=60)
        pose = providers["pose"].detect(person_path, person_asset)

        update_job(request_id, progress=80)
        generated = providers["tryon"].generate(
            person_path,
            garment_path,
            garment,
            mask,
            pose,
        )
        generated = _quality_check(generated)
        generated["garment"] = garment.to_dict()
        generated["mask"] = {
            key: value for key, value in mask.items() if "path" not in key
        }
        generated["pose"] = pose
        generated["output_asset_ids"] = [
            item
            for item in [
                generated.get("output_asset_id"),
                mask.get("mask_asset_id"),
            ]
            if item
        ]

        update_job(
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
    except Exception:
        log_event("error", "tryon_failed", request_id=request_id)
        update_job(
            request_id,
            status="failed",
            progress=100,
            error=ErrorInfo(code="tryon_failed", message="Try-on processing failed."),
        )


def run_garment_job(request_id: str, asset_id: str) -> None:
    providers = get_providers()
    try:
        update_job(request_id, status="processing", progress=20)
        path = assets.path_for_provider(asset_id)
        schema = providers["garment"].analyze(path, asset_id)
        update_job(
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
    except Exception:
        update_job(
            request_id,
            status="failed",
            error=ErrorInfo(code="inference_failed", message="Garment analysis failed."),
        )
