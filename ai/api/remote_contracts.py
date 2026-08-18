from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


Operation = Literal[
    "garment_analysis",
    "human_preprocessing",
    "virtual_try_on",
]
JobStatus = Literal[
    "pending",
    "queued",
    "processing",
    "completed",
    "failed",
    "cancelled",
]


class AssetReference(BaseModel):
    """Opaque asset identity; filesystem paths never cross the API boundary."""

    asset_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,128}$")
    content_type: str | None = None


class JobCreateRequest(BaseModel):
    operation: Operation
    assets: list[AssetReference] = Field(min_length=1, max_length=8)
    asynchronous: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class DiagnosticModel(BaseModel):
    provider: str | None = None
    model: str | None = None
    version: str | None = None
    status: str | None = None
    device: str | None = None
    precision: str | None = None
    capabilities: list[str] | None = None
    memory_mb: int | None = None


class TimingInfo(BaseModel):
    started_at: datetime
    completed_at: datetime | None = None
    duration_ms: float | None = None


class ErrorInfo(BaseModel):
    code: str
    message: str


class JobResponse(BaseModel):
    request_id: str
    operation: Operation
    status: JobStatus
    progress: int | None = 0
    result: Any = None
    model: DiagnosticModel | None = None
    timing: TimingInfo
    error: ErrorInfo | None = None


class Capability(BaseModel):
    name: Operation
    available: bool
    ready: bool
    model: DiagnosticModel | None = None


class CapabilityResponse(BaseModel):
    capabilities: list[Capability]
    execution_mode: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
