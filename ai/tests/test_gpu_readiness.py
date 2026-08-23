from PIL import Image

from models.model_manager import ModelManager
from providers.registry import IDMAdapter, get_providers
from runtime.provider_errors import ProviderUnavailable
from scripts.preflight import collect


def test_gpu_mode_selects_real_adapters(monkeypatch):
    monkeypatch.setenv("AI_EXECUTION_MODE", "gpu")
    providers = get_providers()
    assert providers["garment"].name == "florence"
    assert providers["segmentation"].name == "sam2"
    assert providers["pose"].name == "pose"
    assert providers["tryon"].name == "idm-vton"


def test_gpu_mode_does_not_select_mock_tryon(monkeypatch):
    monkeypatch.setenv("AI_EXECUTION_MODE", "gpu")
    assert get_providers()["tryon"].name != "mock-tryon"


def test_idm_adapter_fails_without_weights(monkeypatch):
    monkeypatch.setattr(
        "models.model_manager.idm_weights_present",
        lambda: False,
    )
    try:
        IDMAdapter().generate("p.png", "g.png", None, {"mask_path_internal": "m.png"}, {})
        raise AssertionError("expected ProviderUnavailable")
    except ProviderUnavailable as error:
        assert error.code == "idm_weights_missing"


def test_idm_adapter_persists_real_result(monkeypatch, tmp_path):
    monkeypatch.setenv("AI_STORAGE_ROOT", str(tmp_path / "assets"))
    monkeypatch.setattr("models.model_manager.idm_weights_present", lambda: True)
    monkeypatch.setattr("models.model_manager.current_device", lambda: "cuda")

    class FakeIDM:
        def load(self):
            return self

        def run(self, person, garment, mask, prompt=""):
            return Image.new("RGB", (32, 32), "purple")

    monkeypatch.setattr("models.idm_loader.idm", FakeIDM())
    result = IDMAdapter().generate(
        "p.png",
        "g.png",
        None,
        {"mask_path_internal": "m.png"},
        {},
    )
    assert result["synthetic"] is False
    assert result["output_asset_id"]
    assert result["generated_image_url"].startswith("/v1/assets/")


def test_model_manager_ready_means_weights_not_residency():
    manager = ModelManager()
    info = manager.info()
    assert info["florence"]["loaded"] is False
    assert info["sam2"]["loaded"] is False
    assert info["idm"]["loaded"] is False
    assert "ready" in info


def test_model_manager_unload_releases_loader():
    manager = ModelManager()

    class Loader:
        def __init__(self):
            self.released = False

        def release(self):
            self.released = True

    loader = Loader()
    manager.register_idm(loader)
    assert manager.info()["resident"] == ["idm"]
    manager.unload("idm")
    assert loader.released is True
    assert manager.idm is None
    assert manager.info()["resident"] == []


def test_preflight_collects_diagnostics_without_loading_models():
    report = collect()
    assert "python" in report
    assert "gpu" in report
    assert "weights" in report
    assert report["weights"]["florence_model"]
    assert "flash_attn" in report["optional_packages"]
    assert report["status"] in {"READY", "WARNING", "NOT_READY"}
    assert "blockers" in report
    assert "warnings" in report


def test_gpu_job_rejects_synthetic_result(monkeypatch, tmp_path):
    from pipelines.orchestrator import run_tryon_job
    from runtime.jobs import create_job, get_job, reset_jobs_for_tests
    from runtime.queue import reset_queue_for_tests
    from runtime.storage import AssetStore

    monkeypatch.setenv("AI_EXECUTION_MODE", "gpu")
    monkeypatch.setenv("AI_STORAGE_ROOT", str(tmp_path / "assets"))
    reset_jobs_for_tests()
    reset_queue_for_tests()
    store = AssetStore(tmp_path / "assets")
    person = store.put(b"person", content_type="image/png", kind="person")
    garment = store.put(b"garment", content_type="image/png", kind="garment")
    monkeypatch.setattr("pipelines.orchestrator.assets", store)

    class Fake:
        def analyze(self, *args, **kwargs):
            from services.garment_schema import GarmentSchema

            return GarmentSchema(garment_type="shirt")

        def segment(self, *args, **kwargs):
            return {"mask_asset_id": "mask"}

        def detect(self, *args, **kwargs):
            return {"detected": True}

        def generate(self, *args, **kwargs):
            return {
                "output_asset_id": "x",
                "generated_image_url": "/v1/assets/x/content",
                "synthetic": True,
                "provider": "idm-vton",
            }

    fake = Fake()
    monkeypatch.setattr(
        "pipelines.orchestrator.get_providers",
        lambda: {
            "garment": fake,
            "segmentation": fake,
            "pose": fake,
            "tryon": fake,
        },
    )
    job = create_job("virtual_try_on", "queued")
    run_tryon_job(job.request_id, person, garment)
    failed = get_job(job.request_id)
    assert failed.status == "failed"
    assert failed.error.code == "unexpected_synthetic"
