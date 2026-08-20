import io

from fastapi.testclient import TestClient
from PIL import Image

from app import app
from runtime.jobs import reset_jobs_for_tests
from runtime.queue import reset_queue_for_tests


def png(color: str) -> bytes:
    image = Image.new("RGB", (48, 48), color)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_full_mock_tryon_pipeline(monkeypatch, tmp_path):
    monkeypatch.setenv("AI_SERVER_TOKEN", "test-token")
    monkeypatch.setenv("AI_EXECUTION_MODE", "mock")
    monkeypatch.setenv("AI_QUEUE_BACKEND", "inline")
    monkeypatch.setenv("AI_STORAGE_ROOT", str(tmp_path))
    reset_queue_for_tests()
    reset_jobs_for_tests()
    client = TestClient(app)
    headers = {"Authorization": "Bearer test-token"}

    person = client.post(
        "/v1/assets",
        headers=headers,
        files={"file": ("person.png", png("blue"), "image/png")},
        data={"kind": "person"},
    )
    garment = client.post(
        "/v1/assets",
        headers=headers,
        files={"file": ("garment.png", png("red"), "image/png")},
        data={"kind": "garment"},
    )
    assert person.status_code == 200
    assert garment.status_code == 200

    created = client.post(
        "/v1/jobs",
        headers=headers,
        json={
            "operation": "virtual_try_on",
            "asynchronous": True,
            "assets": [
                {"asset_id": person.json()["asset_id"]},
                {"asset_id": garment.json()["asset_id"]},
            ],
        },
    )
    assert created.status_code == 200
    job = created.json()
    assert job["status"] == "completed"
    assert job["progress"] == 100
    assert job["result"]["synthetic"] is True
    assert job["result"]["output_asset_id"]
    assert "NOT A REAL" not in job["result"]["generated_image_url"]
    assert job["result"]["generated_image_url"].startswith("/v1/assets/")
    assert job["result"]["generated_image_url"].endswith("/content")
    assert job["result"]["garment"]["processing_status"] == "completed"
    assert job["result"]["mask"]["synthetic"] is True
    assert job["result"]["pose"]["availability"] == "AVAILABLE_MOCK"

    status = client.get(f"/v1/jobs/{job['request_id']}", headers=headers)
    assert status.json()["status"] == "completed"

    content = client.get(job["result"]["generated_image_url"], headers=headers)
    assert content.status_code == 200
    assert content.headers["content-type"] == "image/png"
    image = Image.open(io.BytesIO(content.content))
    assert image.size == (512, 640)
