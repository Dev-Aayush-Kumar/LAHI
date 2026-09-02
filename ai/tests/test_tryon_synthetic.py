from pathlib import Path

from pipelines.tryon_pipeline import process_tryon
from providers.mock import (
    MockGarmentProvider,
    MockPoseProvider,
    MockSegmentationProvider,
)
from runtime.jobs import reset_jobs_for_tests
from runtime.queue import reset_queue_for_tests
from PIL import Image


class RealTryOnProvider:
    name = "idm-vton"
    version = "local"

    def generate(self, person_image_path, garment_image_path, garment, mask, pose):
        return {
            "output_asset_id": "asset_real_result",
            "generated_image_url": "/v1/assets/asset_real_result/content",
            "synthetic": False,
            "execution": "real",
            "provider": self.name,
            "version": self.version,
            "quality": {"passed": True, "notes": []},
        }


def _save_png(path: Path):
    Image.new("RGB", (32, 32), "white").save(path)
    return str(path)


def test_process_tryon_marks_mock_output_synthetic(monkeypatch, tmp_path):
    monkeypatch.setenv("AI_EXECUTION_MODE", "mock")
    monkeypatch.setenv("AI_STORAGE_ROOT", str(tmp_path / "assets"))
    reset_jobs_for_tests()
    reset_queue_for_tests()

    result = process_tryon(
        _save_png(tmp_path / "person.png"),
        _save_png(tmp_path / "garment.png"),
    )
    assert result["synthetic"] is True
    assert result["modelName"] == "mock-tryon"


def test_process_tryon_marks_real_provider_output_not_synthetic(monkeypatch, tmp_path):
    monkeypatch.setenv("AI_STORAGE_ROOT", str(tmp_path / "assets"))
    reset_jobs_for_tests()
    reset_queue_for_tests()
    monkeypatch.setattr(
        "pipelines.orchestrator.get_providers",
        lambda: {
            "garment": MockGarmentProvider(),
            "segmentation": MockSegmentationProvider(),
            "pose": MockPoseProvider(),
            "densepose": MockPoseProvider(),
            "tryon": RealTryOnProvider(),
        },
    )

    result = process_tryon(
        _save_png(tmp_path / "person.png"),
        _save_png(tmp_path / "garment.png"),
    )
    assert result["synthetic"] is False
    assert result["modelName"] == "idm-vton"
    assert result["generatedImageUrl"] == "/v1/assets/asset_real_result/content"
