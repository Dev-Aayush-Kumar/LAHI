from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from runtime.config import BASE_DIR, env
from runtime.errors import ServiceError

ASSET_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


def storage_root() -> Path:
    return Path(env("AI_STORAGE_ROOT") or str(BASE_DIR / "var" / "assets"))


class AssetStore:
    def __init__(self, root: Path | None = None):
        self._root = root

    @property
    def root(self) -> Path:
        path = self._root or storage_root()
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _dir(self, asset_id: str) -> Path:
        if not ASSET_ID_RE.match(asset_id):
            raise ServiceError(400, "invalid_asset_id", "Invalid asset identifier.")
        return self.root / asset_id

    def put(
        self,
        data: bytes,
        *,
        content_type: str,
        kind: str = "binary",
        asset_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        asset_id = asset_id or f"asset_{uuid4().hex[:16]}"
        folder = self._dir(asset_id)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "blob").write_bytes(data)
        payload = {
            "asset_id": asset_id,
            "content_type": content_type,
            "kind": kind,
            "size_bytes": len(data),
            "metadata": metadata or {},
        }
        (folder / "meta.json").write_text(json.dumps(payload), encoding="utf-8")
        return asset_id

    def get(self, asset_id: str) -> bytes:
        path = self._dir(asset_id) / "blob"
        if not path.exists():
            raise ServiceError(404, "asset_not_found", "Asset not found.")
        return path.read_bytes()

    def meta(self, asset_id: str) -> dict[str, Any]:
        path = self._dir(asset_id) / "meta.json"
        if not path.exists():
            raise ServiceError(404, "asset_not_found", "Asset not found.")
        return json.loads(path.read_text(encoding="utf-8"))

    def path_for_provider(self, asset_id: str) -> str:
        """Internal path for local providers. Never returned to API clients."""
        path = self._dir(asset_id) / "blob"
        if not path.exists():
            raise ServiceError(404, "asset_not_found", "Asset not found.")
        return str(path)

    def exists(self, asset_id: str) -> bool:
        return (self._dir(asset_id) / "blob").exists()


assets = AssetStore()
