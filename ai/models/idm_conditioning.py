"""IDM-VTON conditioning helpers: DensePose pose_img and agnostic inpaint masks.

These follow the official Gradio demo path, not MediaPipe landmarks.
DensePose / OpenPose / human-parsing weights live under AI_IDM_ROOT and are
never downloaded at API startup.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from PIL import Image

from models.model_manager import (
    DENSEPOSE_CKPT,
    DENSEPOSE_CONFIG,
    IDM_ROOT_DIR,
    OPENPOSE_BODY,
    PARSING_ATR,
    PARSING_LIP,
    agnostic_mask_assets_present,
    current_device,
    densepose_weights_present,
    models,
)
from runtime.provider_errors import ProviderUnavailable
from runtime.vram import empty_cache

IDM_SIZE = (768, 1024)
DENSEPOSE_SIZE = (384, 512)
MASK_PARSE_SIZE = (384, 512)

GRADIO_DIR = IDM_ROOT_DIR / "gradio_demo"
PREPROCESS_DIR = IDM_ROOT_DIR / "preprocess"


def garment_mask_category(garment: Any) -> str:
    """Map LAHI garment schema fields onto IDM get_mask_location categories."""

    raw = " ".join(
        str(item or "")
        for item in (
            getattr(garment, "category", None),
            getattr(garment, "garment_type", None),
        )
    ).lower()
    if any(token in raw for token in ("dress", "gown", "jumpsuit", "romper")):
        return "dresses"
    if any(
        token in raw
        for token in ("pant", "trouser", "skirt", "short", "jean", "bottom", "lower")
    ):
        return "lower_body"
    return "upper_body"


def garment_description(garment: Any) -> str:
    if garment is None:
        return "shirt"
    for attr in ("garment_type", "category"):
        value = getattr(garment, attr, None)
        if value:
            return str(value).replace("_", " ").strip()
    attrs = getattr(garment, "attributes", None) or {}
    if isinstance(attrs, dict) and attrs.get("caption"):
        return str(attrs["caption"]).strip()
    return "shirt"


def validate_mask_image(
    mask: Image.Image,
    *,
    expected_size: tuple[int, int] = IDM_SIZE,
    source: str = "mask",
    allow_full: bool = False,
) -> Image.Image:
    """Normalize and validate an inpaint mask before IDM-VTON consumes it."""

    if mask.mode not in ("L", "1"):
        mask = mask.convert("L")
    width, height = mask.size
    if (width, height) != expected_size:
        mask = mask.resize(expected_size, Image.Resampling.NEAREST)
        width, height = mask.size
    if (width, height) != expected_size:
        raise ProviderUnavailable(
            "mask_dimension_mismatch",
            f"{source} mask is {width}x{height}; IDM-VTON expects {expected_size[0]}x{expected_size[1]}.",
        )
    arr_min, arr_max = mask.getextrema()
    if arr_max is None or arr_max == 0:
        raise ProviderUnavailable(
            "mask_empty",
            f"{source} mask is empty (all zeros). Refusing IDM-VTON inference.",
        )
    if not allow_full and arr_min == arr_max == 255:
        raise ProviderUnavailable(
            "mask_full_image",
            f"{source} mask covers the entire frame. Refusing IDM-VTON inference.",
        )
    return mask


def _ensure_vendor_paths() -> None:
    for path in (IDM_ROOT_DIR, GRADIO_DIR, PREPROCESS_DIR):
        text = str(path)
        if text not in sys.path:
            sys.path.insert(0, text)


class DensePoseConditioner:
    """Load → infer DensePose visualization → release (T4 sequential)."""

    name = "densepose"

    def __init__(self) -> None:
        self._predictor = None
        self._context = None
        self._execute = None

    def load(self):
        if self._predictor is not None:
            return self
        if not densepose_weights_present():
            raise ProviderUnavailable(
                "densepose_weights_missing",
                "DensePose checkpoint/config missing. "
                f"Expected {DENSEPOSE_CKPT} and {DENSEPOSE_CONFIG}.",
            )
        if current_device() != "cuda":
            raise ProviderUnavailable(
                "cuda_required",
                "DensePose for IDM-VTON requires CUDA. Refusing CPU fallback.",
            )
        models.ensure_vram_for("densepose")
        _ensure_vendor_paths()
        try:
            import apply_net  # type: ignore
            from detectron2.engine.defaults import DefaultPredictor  # type: ignore
        except Exception as error:  # pragma: no cover - depends on GPU host packages
            raise ProviderUnavailable(
                "densepose_import_failed",
                "DensePose/detectron2 is not importable on this worker. "
                f"Install detectron2 for the runtime torch build. Detail: {error}",
            ) from error

        args = apply_net.create_argument_parser().parse_args(
            [
                "show",
                str(DENSEPOSE_CONFIG),
                str(DENSEPOSE_CKPT),
                "dp_segm",
                "-v",
                "--opts",
                "MODEL.DEVICE",
                "cuda",
            ]
        )
        opts: list[str] = []
        cfg = apply_net.ShowAction.setup_config(
            str(DENSEPOSE_CONFIG),
            str(DENSEPOSE_CKPT),
            args,
            opts,
        )
        self._predictor = DefaultPredictor(cfg)
        self._context = apply_net.ShowAction.create_context(args, cfg)
        self._execute = apply_net.ShowAction.execute_on_outputs
        models.register_densepose(self)
        return self

    def run(self, person_image: Image.Image) -> Image.Image:
        if self._predictor is None:
            self.load()
        assert self._predictor is not None
        assert self._execute is not None

        _ensure_vendor_paths()
        try:
            from detectron2.data.detection_utils import (  # type: ignore
                _apply_exif_orientation,
                convert_PIL_to_numpy,
            )
        except Exception as error:  # pragma: no cover
            raise ProviderUnavailable(
                "densepose_import_failed",
                f"detectron2 image utils unavailable: {error}",
            ) from error

        import torch

        human = person_image.convert("RGB").resize(DENSEPOSE_SIZE, Image.Resampling.LANCZOS)
        human_arg = _apply_exif_orientation(human)
        human_bgr = convert_PIL_to_numpy(human_arg, format="BGR")
        try:
            with torch.inference_mode():
                outputs = self._predictor(human_bgr)["instances"]
                pose_bgr = self._execute(
                    self._context,
                    {"image": human_bgr},
                    outputs,
                )
        except RuntimeError as error:
            message = str(error).lower()
            if "out of memory" in message or "cuda" in message and "memory" in message:
                empty_cache()
                raise ProviderUnavailable(
                    "gpu_oom",
                    "DensePose ran out of GPU memory on this T4 worker.",
                ) from error
            raise

        if pose_bgr is None:
            raise ProviderUnavailable(
                "densepose_failed",
                "DensePose produced no visualization for the person image.",
            )
        pose_rgb = pose_bgr[:, :, ::-1]
        return Image.fromarray(pose_rgb).resize(IDM_SIZE, Image.Resampling.LANCZOS)

    def release(self) -> None:
        self._predictor = None
        self._context = None
        self._execute = None
        empty_cache()


class AgnosticMaskBuilder:
    """OpenPose + human-parsing agnostic mask used by upstream IDM-VTON."""

    name = "idm-agnostic-mask"

    def __init__(self) -> None:
        self._openpose = None
        self._parsing = None

    def load(self):
        if self._openpose is not None and self._parsing is not None:
            return self
        if not agnostic_mask_assets_present():
            raise ProviderUnavailable(
                "idm_mask_weights_missing",
                "OpenPose/human-parsing assets missing for agnostic masks. "
                f"Expected {OPENPOSE_BODY}, {PARSING_ATR}, {PARSING_LIP}.",
            )
        models.ensure_vram_for("openpose")
        _ensure_vendor_paths()
        try:
            from preprocess.humanparsing.run_parsing import Parsing  # type: ignore
            from preprocess.openpose.run_openpose import OpenPose  # type: ignore
        except Exception as error:  # pragma: no cover
            raise ProviderUnavailable(
                "idm_mask_import_failed",
                f"OpenPose/parsing modules failed to import: {error}",
            ) from error

        device_index = 0
        self._openpose = OpenPose(device_index)
        self._parsing = Parsing(device_index)
        models.register_openpose(self)
        return self

    def run(self, person_image: Image.Image, category: str = "upper_body") -> Image.Image:
        if self._openpose is None or self._parsing is None:
            self.load()
        assert self._openpose is not None
        assert self._parsing is not None

        _ensure_vendor_paths()
        try:
            from utils_mask import get_mask_location  # type: ignore
        except Exception as error:  # pragma: no cover
            raise ProviderUnavailable(
                "idm_mask_import_failed",
                f"utils_mask.get_mask_location unavailable: {error}",
            ) from error

        human = person_image.convert("RGB").resize(IDM_SIZE, Image.Resampling.LANCZOS)
        parse_input = human.resize(MASK_PARSE_SIZE, Image.Resampling.LANCZOS)
        try:
            keypoints = self._openpose(parse_input)
            model_parse, _ = self._parsing(parse_input)
            mask, _ = get_mask_location("hd", category, model_parse, keypoints)
        except RuntimeError as error:
            message = str(error).lower()
            if "out of memory" in message:
                empty_cache()
                raise ProviderUnavailable(
                    "gpu_oom",
                    "OpenPose/parsing ran out of GPU memory while building the agnostic mask.",
                ) from error
            raise
        mask = mask.resize(IDM_SIZE, Image.Resampling.NEAREST)
        return validate_mask_image(mask, source="agnostic")

    def release(self) -> None:
        self._openpose = None
        self._parsing = None
        empty_cache()


densepose = DensePoseConditioner()
agnostic_mask = AgnosticMaskBuilder()
