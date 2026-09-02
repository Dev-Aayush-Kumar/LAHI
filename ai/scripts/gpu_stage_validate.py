"""Validate real GPU pipeline stages on a Tesla T4 worker (Colab or VM).

Runs preflight first, then exercises each heavy stage sequentially with VRAM
snapshots. Does not substitute mock output.

Usage (Colab, after setup in docs/COLAB.md):

    cd /content/LAHI/ai
    export AI_EXECUTION_MODE=gpu
    export AI_SERVER_TOKEN=<token>
    python scripts/gpu_stage_validate.py --person /path/person.jpg --garment /path/garment.jpg

Exit 0 only when all selected stages pass on CUDA.
"""

from __future__ import annotations

import argparse
import gc
import json
import os
import platform
import shutil
import sys
import time
import traceback
from contextlib import contextmanager
from pathlib import Path
from typing import Any

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

os.environ.setdefault("AI_EXECUTION_MODE", "gpu")


def _disk_free_gb(path: Path) -> float | None:
    try:
        usage = shutil.disk_usage(path)
        return round(usage.free / (1024**3), 2)
    except OSError:
        return None


def collect_environment() -> dict[str, Any]:
    info: dict[str, Any] = {
        "python": sys.version.split()[0],
        "executable": sys.executable,
        "platform": platform.platform(),
        "cwd": str(Path.cwd()),
        "ai_root": str(AI_ROOT),
        "disk_free_gb": _disk_free_gb(AI_ROOT),
    }
    try:
        import pip

        info["pip"] = pip.__version__
    except Exception:
        info["pip"] = None
    try:
        import torch

        info["torch"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        info["cuda_version"] = getattr(torch.version, "cuda", None)
        if torch.cuda.is_available():
            idx = torch.cuda.current_device()
            props = torch.cuda.get_device_properties(idx)
            info["gpu_name"] = torch.cuda.get_device_name(idx)
            info["vram_total_mb"] = int(props.total_memory / (1024 * 1024))
    except Exception as error:
        info["torch_error"] = str(error)
    try:
        import torchvision

        info["torchvision"] = torchvision.__version__
    except Exception as error:
        info["torchvision_error"] = str(error)
    return info


@contextmanager
def stage(name: str, results: dict[str, Any]):
    from runtime.vram import snapshot

    entry: dict[str, Any] = {"name": name, "ok": False}
    entry["vram_before"] = snapshot()
    started = time.time()
    try:
        yield entry
        entry["ok"] = True
    except Exception as error:
        entry["ok"] = False
        entry["error"] = str(error)[:500]
        entry["traceback"] = traceback.format_exc()[-1200:]
        raise
    finally:
        entry["seconds"] = round(time.time() - started, 2)
        entry["vram_after"] = snapshot()
        results["stages"].append(entry)
        gc.collect()
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass


def validate_preflight(results: dict[str, Any]) -> None:
    from scripts.preflight import collect

    report = collect()
    results["preflight"] = {
        "status": report["status"],
        "verdict": report["verdict"],
        "blockers": report["blockers"],
        "warnings": report["warnings"],
    }
    if report["verdict"] != "READY FOR REAL VTO":
        raise RuntimeError(
            f"Preflight not green: {report['verdict']} blockers={report['blockers']}"
        )


def validate_agnostic_mask(person: Path, results: dict[str, Any]) -> dict[str, Any]:
    from PIL import Image

    from models.idm_conditioning import IDM_SIZE, agnostic_mask
    from models.model_manager import agnostic_mask_assets_present, models

    if not agnostic_mask_assets_present():
        return {"skipped": True, "reason": "agnostic assets missing; use SAM2 fallback"}

    with stage("agnostic_mask", results):
        image = Image.open(person).convert("RGB")
        agnostic_mask.load()
        try:
            mask = agnostic_mask.run(image, category="upper_body")
        finally:
            models.release_after_stage("openpose")
        assert mask.size == IDM_SIZE, mask.size
        lo, hi = mask.getextrema()
        assert hi > 0 and lo < 255, (lo, hi)
        out = AI_ROOT / "var" / "stage_validate_mask.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        mask.save(out)
        return {"path": str(out), "size": list(mask.size), "extrema": [lo, hi], "provider": "agnostic"}


def validate_sam2_mask(person: Path, results: dict[str, Any]) -> dict[str, Any]:
    from providers.registry import SAM2Adapter, person_segmentation_input
    from services.garment_schema import GarmentSchema

    with stage("sam2_mask", results):
        result = SAM2Adapter().segment(
            str(person),
            person_segmentation_input(GarmentSchema(garment_type="shirt")),
            "stage_validate_person",
        )
        path = result.get("mask_path_internal")
        if not path:
            raise RuntimeError("SAM2 did not return mask_path_internal")
        return {"path": path, "provider": "sam2", **result}


def resolve_mask(person: Path, results: dict[str, Any]) -> Path:
    mask_info = validate_agnostic_mask(person, results)
    if mask_info.get("path"):
        return Path(mask_info["path"])
    if mask_info.get("skipped"):
        print("Agnostic mask assets missing; falling back to SAM2 mask path.")
        sam2_info = validate_sam2_mask(person, results)
        results["mask"] = sam2_info
        return Path(sam2_info["path"])
    raise RuntimeError("Mask stage did not produce a path")


def validate_densepose(person: Path, results: dict[str, Any]) -> dict[str, Any]:
    from PIL import Image

    from models.idm_conditioning import IDM_SIZE, densepose
    from models.model_manager import models

    with stage("densepose", results):
        image = Image.open(person).convert("RGB")
        densepose.load()
        try:
            pose = densepose.run(image)
        finally:
            models.release_after_stage("densepose")
        assert pose.size == IDM_SIZE, pose.size
        out = AI_ROOT / "var" / "stage_validate_pose.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        pose.save(out)
        return {"path": str(out), "size": list(pose.size)}


def validate_florence(garment: Path, results: dict[str, Any]) -> dict[str, Any]:
    from providers.registry import FlorenceGarmentAdapter
    from models.model_manager import models

    with stage("florence", results):
        schema = FlorenceGarmentAdapter().analyze(str(garment), "stage_validate_garment")
        models.release_after_stage("florence")
        return {
            "garment_type": schema.garment_type,
            "status": str(schema.processing_status),
        }


def validate_idm(
    person: Path,
    garment: Path,
    mask_path: Path | None,
    pose_path: Path | None,
    results: dict[str, Any],
    *,
    steps: int = 30,
) -> dict[str, Any]:
    from PIL import Image

    from models.idm_conditioning import validate_mask_image
    from models.idm_loader import idm
    from models.model_manager import models
    from services.garment_schema import GarmentSchema

    if mask_path is None or not mask_path.exists():
        raise RuntimeError("IDM stage requires a mask from agnostic or SAM2 stage")
    if pose_path is None or not pose_path.exists():
        raise RuntimeError("IDM stage requires DensePose output")

    with stage("idm_vton", results):
        idm.load()
        try:
            result = idm.run(
                str(person),
                str(garment),
                str(mask_path),
                pose_image=str(pose_path),
                garment=GarmentSchema(garment_type="shirt"),
                num_inference_steps=steps,
                seed=42,
            )
        finally:
            models.release_after_stage("idm")
        assert isinstance(result, Image.Image)
        out = AI_ROOT / "var" / "stage_validate_tryon.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        result.save(out)
        validate_mask_image(Image.open(mask_path), source="idm_stage")
        return {
            "path": str(out),
            "size": list(result.size),
            "mode": result.mode,
        }


def validate_full_job(person: Path, garment: Path, results: dict[str, Any]) -> dict[str, Any]:
    from pipelines.orchestrator import run_tryon_job
    from runtime.jobs import create_job, get_job, reset_jobs_for_tests
    from runtime.queue import reset_queue_for_tests
    from runtime.storage import AssetStore

    storage_root = AI_ROOT / "var" / "stage_validate_assets"
    storage_root.mkdir(parents=True, exist_ok=True)
    store = AssetStore(storage_root)
    reset_jobs_for_tests()
    reset_queue_for_tests()

    person_id = store.put(person.read_bytes(), content_type="image/jpeg", kind="person")
    garment_id = store.put(garment.read_bytes(), content_type="image/jpeg", kind="garment")

    with stage("full_tryon_job", results):
        import pipelines.orchestrator as orchestrator

        original_assets = orchestrator.assets
        orchestrator.assets = store
        try:
            job = create_job("virtual_try_on", "queued")
            run_tryon_job(job.request_id, person_id, garment_id)
            completed = get_job(job.request_id)
        finally:
            orchestrator.assets = original_assets

        if completed is None:
            raise RuntimeError("Job record missing after run")
        if completed.status != "completed":
            raise RuntimeError(
                f"Job failed: status={completed.status} error={completed.error}"
            )
        result = completed.result or {}
        if result.get("synthetic"):
            raise RuntimeError("Job completed with synthetic=true")
        return {
            "request_id": completed.request_id,
            "status": completed.status,
            "synthetic": result.get("synthetic"),
            "provider": result.get("provider"),
            "output_asset_id": result.get("output_asset_id"),
            "duration_ms": completed.timing.duration_ms,
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="LAHI real GPU stage validator")
    parser.add_argument("--person", type=Path, required=True, help="Real person image")
    parser.add_argument("--garment", type=Path, required=True, help="Real garment image")
    parser.add_argument(
        "--skip-florence",
        action="store_true",
        help="Skip Florence (saves VRAM/time if garment schema not needed for mask category)",
    )
    parser.add_argument(
        "--skip-full-job",
        action="store_true",
        help="Stop after isolated IDM stage (no /v1 job orchestration)",
    )
    parser.add_argument("--idm-steps", type=int, default=30)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if not args.person.exists() or not args.garment.exists():
        print("Person and garment paths must exist.", file=sys.stderr)
        return 1

    report: dict[str, Any] = {
        "environment": collect_environment(),
        "stages": [],
    }

    env = report["environment"]
    if not env.get("cuda_available"):
        print("CUDA is not available. This script requires a GPU worker.", file=sys.stderr)
        if args.json:
            print(json.dumps(report, indent=2))
        return 1

    try:
        validate_preflight(report)
        mask_path = resolve_mask(args.person, report)
        report.setdefault("mask", report["stages"][-1])

        pose_info = validate_densepose(args.person, report)
        report["densepose"] = pose_info
        pose_path = Path(pose_info["path"])

        if not args.skip_florence:
            report["florence"] = validate_florence(args.garment, report)

        report["idm"] = validate_idm(
            args.person,
            args.garment,
            mask_path,
            pose_path,
            report,
            steps=args.idm_steps,
        )

        if not args.skip_full_job:
            report["job"] = validate_full_job(args.person, args.garment, report)

        report["verdict"] = "GPU STAGES VERIFIED"
    except Exception as error:
        report["verdict"] = "GPU STAGE VALIDATION FAILED"
        report["failure"] = str(error)
        if args.json:
            print(json.dumps(report, indent=2, default=str))
        else:
            print(f"FAILED: {error}")
            for stage_result in report["stages"]:
                mark = "OK" if stage_result.get("ok") else "FAIL"
                print(
                    f"  [{mark}] {stage_result['name']} "
                    f"{stage_result.get('seconds', '?')}s "
                    f"{stage_result.get('error', '')}"
                )
        return 1

    if args.json:
        print(json.dumps(report, indent=2, default=str))
    else:
        print("GPU STAGES VERIFIED")
        print(f"  GPU     {env.get('gpu_name')} ({env.get('vram_total_mb')} MB)")
        print(f"  torch   {env.get('torch')} cuda={env.get('cuda_version')}")
        for stage_result in report["stages"]:
            print(
                f"  [OK] {stage_result['name']} {stage_result['seconds']}s "
                f"vram={stage_result.get('vram_after', {}).get('vram_allocated_mb')} MB"
            )
        if report.get("job"):
            job = report["job"]
            print(
                f"  job {job['request_id']} synthetic={job['synthetic']} "
                f"duration_ms={job.get('duration_ms')}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
