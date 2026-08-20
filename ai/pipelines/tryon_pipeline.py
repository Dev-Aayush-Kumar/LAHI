from pathlib import Path


def process_tryon(
    person_image: str,
    garment_image: str,
):
    """
    Complete LAHI AI Pipeline (provider-agnostic)

    Person Image
          ↓
    Garment understanding provider
          ↓
    Segmentation provider
          ↓
    Pose provider
          ↓
    Try-on provider
          ↓
    Generated Image
    """
    from pipelines.orchestrator import run_tryon_job
    from runtime.jobs import create_job, get_job
    from runtime.storage import assets

    person_id = assets.put(
        Path(person_image).read_bytes(),
        content_type="image/jpeg",
        kind="person",
    )
    garment_id = assets.put(
        Path(garment_image).read_bytes(),
        content_type="image/jpeg",
        kind="garment",
    )
    job = create_job("virtual_try_on", "queued")
    run_tryon_job(job.request_id, person_id, garment_id)
    completed = get_job(job.request_id)
    result = completed.result if completed else {}
    return {
        "generatedImageUrl": result.get("generated_image_url", ""),
        "modelName": result.get("provider", "mock-tryon"),
        "generationTimeMs": int(completed.timing.duration_ms or 0) if completed else 0,
        "synthetic": bool(result.get("synthetic")),
    }
