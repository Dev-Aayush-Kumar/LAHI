import io
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import app
from runtime.jobs import reset_jobs_for_tests
from runtime.queue import reset_queue_for_tests


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("AI_SERVER_TOKEN", "test-token")
    monkeypatch.setenv("AI_EXECUTION_MODE", "mock")
    monkeypatch.setenv("AI_QUEUE_BACKEND", "inline")
    reset_queue_for_tests()
    reset_jobs_for_tests()
    return TestClient(app)


def image_bytes(color="white"):
    image = Image.new("RGB", (32, 32), color)
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def auth(client, **kwargs):
    headers = {"Authorization": "Bearer test-token"}
    headers.update(kwargs.get("headers", {}))
    kwargs["headers"] = headers
    return kwargs


def test_health_is_available_without_auth(client):
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_capabilities_require_auth(client):
    response = client.get("/v1/capabilities")
    assert response.status_code == 401


def test_capabilities_are_discoverable(client):
    response = client.get(
        "/v1/capabilities",
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 200
    assert {item["name"] for item in response.json()["capabilities"]} == {
        "garment_analysis",
        "human_preprocessing",
        "virtual_try_on",
    }


def test_invalid_upload_is_rejected(client):
    response = client.post(
        "/v1/garments/analyze",
        headers={"Authorization": "Bearer test-token"},
        files={"image": ("notes.txt", b"not-an-image", "text/plain")},
    )
    assert response.status_code == 415


def test_valid_job_schema_returns_job(client):
    response = client.post(
        "/v1/jobs",
        headers={"Authorization": "Bearer test-token"},
        json={
            "operation": "virtual_try_on",
            "assets": [{"asset_id": "upload_123"}],
            "asynchronous": True,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["operation"] == "virtual_try_on"
    assert body["request_id"]
    assert body["status"] in {"queued", "processing", "completed", "failed"}
    status = client.get(
        f"/v1/jobs/{body['request_id']}",
        headers={"Authorization": "Bearer test-token"},
    )
    assert status.status_code == 200
    assert status.json()["request_id"] == body["request_id"]


def test_valid_image_upload_returns_job_contract(client, monkeypatch):
    monkeypatch.setitem(
        __import__("sys").modules,
        "services.florence_caption",
        SimpleNamespace(
            generate_caption=lambda path: {"parsed": {"garment_type": "shirt"}}
        ),
    )
    response = client.post(
        "/v1/garments/analyze",
        headers={"Authorization": "Bearer test-token"},
        files={"image": ("shirt.png", image_bytes(), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["operation"] == "garment_analysis"
    assert body["status"] == "completed"
    assert body["result"]["parsed"]["garment_type"] == "shirt"


def _upload_png(client, name="image.png"):
    response = client.post(
        "/v1/assets",
        headers={"Authorization": "Bearer test-token"},
        files={"file": (name, image_bytes(), "image/png")},
        data={"kind": "image"},
    )
    assert response.status_code == 200
    return response.json()["asset_id"]


def test_every_advertised_async_operation_has_an_execution_path(client):
    capabilities = client.get(
        "/v1/capabilities",
        headers={"Authorization": "Bearer test-token"},
    )
    assert capabilities.status_code == 200
    names = {item["name"] for item in capabilities.json()["capabilities"]}
    assert names == {"garment_analysis", "human_preprocessing", "virtual_try_on"}

    person = _upload_png(client, "person.png")
    garment = _upload_png(client, "garment.png")

    payloads = {
        "garment_analysis": [{"asset_id": garment}],
        "human_preprocessing": [{"asset_id": person}],
        "virtual_try_on": [{"asset_id": person}, {"asset_id": garment}],
    }

    for operation in names:
        created = client.post(
            "/v1/jobs",
            headers={"Authorization": "Bearer test-token"},
            json={
                "operation": operation,
                "asynchronous": True,
                "assets": payloads[operation],
            },
        )
        assert created.status_code == 200, operation
        body = created.json()
        assert body["operation"] == operation
        assert body["status"] != "queued"
        assert body["status"] in {"processing", "completed", "failed"}
        status = client.get(
            f"/v1/jobs/{body['request_id']}",
            headers={"Authorization": "Bearer test-token"},
        )
        assert status.status_code == 200
        assert status.json()["status"] in {"processing", "completed", "failed"}
        assert status.json()["status"] != "queued"
