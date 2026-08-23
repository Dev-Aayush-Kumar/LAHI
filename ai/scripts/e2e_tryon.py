"""Smoke a real or mock /v1 try-on job against any AI_SERVER_URL."""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import httpx
from PIL import Image


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _png(path: Path, color: str) -> None:
    Image.new("RGB", (64, 64), color).save(path)


def request_json(client: httpx.Client, method: str, url: str, **kwargs):
    response = client.request(method, url, **kwargs)
    print(f"{method} {url} -> {response.status_code}")
    if response.headers.get("content-type", "").startswith("application/json"):
        body = response.json()
        print(body)
        return response.status_code, body
    print(response.text[:400])
    return response.status_code, None


def run(base_url: str, token: str, person: Path, garment: Path, timeout: float) -> int:
    base_url = base_url.rstrip("/")
    with httpx.Client(timeout=timeout) as client:
        status, health = request_json(client, "GET", f"{base_url}/v1/health")
        if status != 200:
            return 1
        status, ready = request_json(
            client, "GET", f"{base_url}/v1/readiness", headers=_headers(token)
        )
        if status == 401:
            print("Authentication failed. Check AI_SERVER_TOKEN.")
            return 1
        status, caps = request_json(
            client, "GET", f"{base_url}/v1/capabilities", headers=_headers(token)
        )
        if status != 200:
            return 1

        def upload(path: Path, kind: str) -> str:
            with path.open("rb") as handle:
                status, body = request_json(
                    client,
                    "POST",
                    f"{base_url}/v1/assets",
                    headers=_headers(token),
                    files={"file": (path.name, handle, "image/png")},
                    data={"kind": kind},
                )
            if status != 200 or not body:
                raise SystemExit(f"Upload failed for {kind}")
            return body["asset_id"]

        person_id = upload(person, "person")
        garment_id = upload(garment, "garment")
        status, created = request_json(
            client,
            "POST",
            f"{base_url}/v1/jobs",
            headers={**_headers(token), "content-type": "application/json"},
            json={
                "operation": "virtual_try_on",
                "asynchronous": True,
                "assets": [
                    {"asset_id": person_id, "content_type": "image/png"},
                    {"asset_id": garment_id, "content_type": "image/png"},
                ],
            },
        )
        if status != 200 or not created:
            return 1
        request_id = created["request_id"]
        deadline = time.time() + timeout
        job = created
        while job.get("status") in {"queued", "processing", "pending"} and time.time() < deadline:
            time.sleep(2)
            status, job = request_json(
                client,
                "GET",
                f"{base_url}/v1/jobs/{request_id}",
                headers=_headers(token),
            )
            if status != 200 or not job:
                return 1
            print(f"progress={job.get('progress')} status={job.get('status')}")

        job_status = job.get("status")
        if job_status == "cancelled":
            print("JOB CANCELLED")
            return 2
        if job_status == "failed":
            print("JOB FAILED")
            print(job.get("error"))
            return 2
        if job_status in {"queued", "processing", "pending"}:
            print("JOB TIMED OUT")
            return 2
        if job_status != "completed":
            print(f"JOB NOT COMPLETED status={job_status}")
            print(job.get("error"))
            return 2

        result = job.get("result") or {}
        garment = result.get("garment") or {}
        if garment.get("processing_status") == "partial":
            print("JOB COMPLETED with PARTIAL garment understanding")
        url = result.get("generated_image_url")
        print(f"synthetic={result.get('synthetic')} result={url}")
        if not url:
            print("Completed job has no generated_image_url.")
            return 2
        content = client.get(f"{base_url}{url}", headers=_headers(token))
        print(f"GET {url} -> {content.status_code} {content.headers.get('content-type')}")
        if content.status_code != 200:
            return 2
        print("E2E /v1 job completed.")
        print("Browser clients must load this via Next.js /api/vto/media/{jobId}, not this AI URL.")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="LAHI /v1 try-on smoke harness")
    parser.add_argument("--base-url", default=os.getenv("AI_SERVER_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--token", default=os.getenv("AI_SERVER_TOKEN", ""))
    parser.add_argument("--person", type=Path)
    parser.add_argument("--garment", type=Path)
    parser.add_argument("--timeout", type=float, default=900)
    parser.add_argument("--health-only", action="store_true")
    args = parser.parse_args()
    if not args.token:
        print("AI_SERVER_TOKEN / --token is required.")
        return 1
    if args.health_only:
        with httpx.Client(timeout=30) as client:
            status, body = request_json(client, "GET", f"{args.base_url.rstrip('/')}/v1/health")
            if status != 200:
                return 1
            status, ready = request_json(
                client,
                "GET",
                f"{args.base_url.rstrip('/')}/v1/readiness",
                headers=_headers(args.token),
            )
            print(f"readiness={ready}")
            return 0 if status == 200 else 1

    tmp = Path(os.getenv("TEMP") or os.getenv("TMP") or "/tmp")
    person = args.person or tmp / "lahi-e2e-person.png"
    garment = args.garment or tmp / "lahi-e2e-garment.png"
    if args.person is None:
        _png(person, "blue")
    if args.garment is None:
        _png(garment, "red")
    return run(args.base_url, args.token, person, garment, args.timeout)


if __name__ == "__main__":
    raise SystemExit(main())
