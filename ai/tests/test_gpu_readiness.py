from PIL import Image

from models.idm_conditioning import (
    garment_description,
    garment_mask_category,
    validate_mask_image,
)
from models.model_manager import ModelManager
from providers.registry import IDMAdapter, get_providers
from runtime.provider_errors import ProviderUnavailable
from scripts.preflight import collect
from services.garment_schema import GarmentSchema


def test_gpu_mode_selects_real_adapters(monkeypatch):
    monkeypatch.setenv("AI_EXECUTION_MODE", "gpu")
    monkeypatch.setattr(
        "providers.registry._segmentation_provider",
        lambda: type("S", (), {"name": "sam2", "version": "t"})(),
    )
    providers = get_providers()
    assert providers["garment"].name == "florence"
    assert providers["segmentation"].name == "sam2"
    assert providers["pose"].name == "pose"
    assert providers["densepose"].name == "densepose"
    assert providers["tryon"].name == "idm-vton"


def test_gpu_mode_does_not_select_mock_tryon(monkeypatch):
    monkeypatch.setenv("AI_EXECUTION_MODE", "gpu")
    monkeypatch.setattr(
        "providers.registry._segmentation_provider",
        lambda: type("S", (), {"name": "idm-agnostic-mask", "version": "t"})(),
    )
    assert get_providers()["tryon"].name != "mock-tryon"


def test_idm_adapter_fails_without_weights(monkeypatch):
    monkeypatch.setattr(
        "models.model_manager.idm_conditioning_ready",
        lambda: False,
    )
    try:
        IDMAdapter().generate(
            "p.png",
            "g.png",
            None,
            {"mask_path_internal": "m.png"},
            {"pose_path_internal": "pose.png"},
        )
        raise AssertionError("expected ProviderUnavailable")
    except ProviderUnavailable as error:
        assert error.code == "idm_weights_missing"


def test_idm_adapter_requires_densepose_path(monkeypatch, tmp_path):
    monkeypatch.setattr("models.model_manager.idm_conditioning_ready", lambda: True)
    monkeypatch.setattr("models.model_manager.current_device", lambda: "cuda")
    mask = tmp_path / "mask.png"
    Image.new("L", (768, 1024), 128).save(mask)
    try:
        IDMAdapter().generate(
            "p.png",
            "g.png",
            GarmentSchema(garment_type="shirt"),
            {"mask_path_internal": str(mask)},
            {},
        )
        raise AssertionError("expected ProviderUnavailable")
    except ProviderUnavailable as error:
        assert error.code == "densepose_missing"


def test_idm_adapter_persists_real_result(monkeypatch, tmp_path):
    monkeypatch.setenv("AI_STORAGE_ROOT", str(tmp_path / "assets"))
    monkeypatch.setattr("models.model_manager.idm_conditioning_ready", lambda: True)
    monkeypatch.setattr("models.model_manager.current_device", lambda: "cuda")

    mask = tmp_path / "mask.png"
    pose = tmp_path / "pose.png"
    Image.new("L", (768, 1024), 128).save(mask)
    Image.new("RGB", (768, 1024), "orange").save(pose)

    class FakeIDM:
        def load(self):
            return self

        def run(self, person, garment_image, mask_path, prompt="", pose_image=None, garment=None, **kwargs):
            assert pose_image == str(pose)
            assert prompt == "shirt"
            return Image.new("RGB", (768, 1024), "purple")

    monkeypatch.setattr("models.idm_loader.idm", FakeIDM())
    monkeypatch.setattr(
        "models.model_manager.models.release_after_stage",
        lambda name: None,
    )
    result = IDMAdapter().generate(
        "p.png",
        "g.png",
        GarmentSchema(garment_type="shirt"),
        {"mask_path_internal": str(mask), "mask_kind": "agnostic", "provider": "idm-agnostic-mask"},
        {"pose_path_internal": str(pose), "provider": "densepose"},
    )
    assert result["synthetic"] is False
    assert result["execution"] == "real"
    assert result["output_asset_id"]
    assert result["generated_image_url"].startswith("/v1/assets/")


def test_validate_mask_rejects_empty_and_full(tmp_path):
    empty = Image.new("L", (768, 1024), 0)
    full = Image.new("L", (768, 1024), 255)
    ok = Image.new("L", (100, 100), 0)
    ok.paste(255, (10, 10, 80, 80))
    try:
        validate_mask_image(empty)
        raise AssertionError("expected empty failure")
    except ProviderUnavailable as error:
        assert error.code == "mask_empty"
    try:
        validate_mask_image(full)
        raise AssertionError("expected full failure")
    except ProviderUnavailable as error:
        assert error.code == "mask_full_image"
    resized = validate_mask_image(ok)
    assert resized.size == (768, 1024)


def test_garment_mask_category_and_description():
    assert garment_mask_category(GarmentSchema(category="dresses")) == "dresses"
    assert garment_mask_category(GarmentSchema(garment_type="jeans")) == "lower_body"
    assert garment_mask_category(GarmentSchema(garment_type="tshirt")) == "upper_body"
    assert garment_description(GarmentSchema(garment_type="blazer")) == "blazer"


def test_model_manager_ready_means_weights_not_residency():
    manager = ModelManager()
    info = manager.info()
    assert info["florence"]["loaded"] is False
    assert info["sam2"]["loaded"] is False
    assert info["idm"]["loaded"] is False
    assert "densepose" in info
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
    assert "verdict" in report
    assert report["weights"]["florence_model"]
    assert "flash_attn" in report["optional_packages"]
    assert "densepose" in report["weights"]
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
            return GarmentSchema(garment_type="shirt")

        def segment(self, *args, **kwargs):
            return {"mask_asset_id": "mask", "mask_kind": "agnostic"}

        def detect(self, *args, **kwargs):
            return {"detected": True, "pose_asset_id": "pose"}

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
            "densepose": fake,
            "tryon": fake,
        },
    )
    job = create_job("virtual_try_on", "queued")
    run_tryon_job(job.request_id, person, garment)
    failed = get_job(job.request_id)
    assert failed.status == "failed"
    assert failed.error.code == "unexpected_synthetic"


def test_gpu_job_maps_oom_to_structured_failure(monkeypatch, tmp_path):
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
            return GarmentSchema(garment_type="shirt")

        def segment(self, *args, **kwargs):
            return {"mask_asset_id": "mask"}

        def detect(self, *args, **kwargs):
            return {"detected": True, "pose_asset_id": "pose"}

        def generate(self, *args, **kwargs):
            raise RuntimeError("CUDA out of memory. Tried to allocate 2.00 GiB")

    fake = Fake()
    monkeypatch.setattr(
        "pipelines.orchestrator.get_providers",
        lambda: {
            "garment": fake,
            "segmentation": fake,
            "pose": fake,
            "densepose": fake,
            "tryon": fake,
        },
    )
    job = create_job("virtual_try_on", "queued")
    run_tryon_job(job.request_id, person, garment)
    failed = get_job(job.request_id)
    assert failed.status == "failed"
    assert failed.error.code == "gpu_oom"
