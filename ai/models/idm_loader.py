"""Canonical IDM-VTON loader for LAHI.

Call signature matches the official Gradio demo / inference path:
person image + garment + agnostic mask + DensePose pose_img + prompt embeds
+ cloth tensor + IP-Adapter garment image.
"""

from __future__ import annotations

import gc
import sys
import time
import importlib.util
from pathlib import Path

from PIL import Image

from models.idm_conditioning import (
    IDM_SIZE,
    garment_description,
    validate_mask_image,
)
from models.model_manager import (
    IDM_CKPT_DIR,
    IDM_SRC_DIR,
    current_device,
    densepose_weights_present,
    idm_weights_present,
    models,
)
from runtime.provider_errors import ProviderUnavailable
from runtime.vram import empty_cache, snapshot as vram_snapshot

IDM_ROOT_DIR = IDM_SRC_DIR.parent
NEGATIVE_PROMPT = "monochrome, lowres, bad anatomy, worst quality, low quality"
DEFAULT_STEPS = 30
DEFAULT_GUIDANCE = 2.0


def _import_from_path(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _resize_rgb(image: Image.Image, size=IDM_SIZE) -> Image.Image:
    image = image.convert("RGB")
    if image.size == size:
        return image
    return image.resize(size, Image.Resampling.LANCZOS)


def _is_oom(error: BaseException) -> bool:
    message = str(error).lower()
    return "out of memory" in message or (
        "cuda" in message and "memory" in message
    )


class IDMLoader:
    def __init__(self):
        self.pipe = None
        self._tensor_transform = None

    def load(self):
        if self.pipe is not None:
            return self.pipe

        if not idm_weights_present():
            raise ProviderUnavailable(
                "idm_weights_missing",
                f"IDM-VTON checkpoints or sources are incomplete at {IDM_ROOT_DIR}.",
            )
        if not densepose_weights_present():
            raise ProviderUnavailable(
                "densepose_weights_missing",
                "DensePose assets are required for real IDM-VTON inference.",
            )
        if current_device() != "cuda":
            raise ProviderUnavailable(
                "cuda_required",
                "GPU mode requires CUDA for IDM-VTON. Refusing CPU fallback.",
            )

        models.ensure_vram_for("idm")

        import torch
        from torchvision import transforms
        from diffusers import AutoencoderKL, DDPMScheduler
        from transformers import (
            AutoTokenizer,
            CLIPImageProcessor,
            CLIPTextModel,
            CLIPTextModelWithProjection,
            CLIPVisionModelWithProjection,
        )

        start = time.time()
        print("Loading IDM-VTON...")

        if str(IDM_ROOT_DIR) not in sys.path:
            sys.path.insert(0, str(IDM_ROOT_DIR))

        device = current_device()
        dtype = torch.float16

        unet_hacked_tryon = _import_from_path(
            "unet_hacked_tryon",
            IDM_SRC_DIR / "unet_hacked_tryon.py",
        )
        unet_hacked_garmnet = _import_from_path(
            "unet_hacked_garmnet",
            IDM_SRC_DIR / "unet_hacked_garmnet.py",
        )
        tryon_pipeline = _import_from_path(
            "tryon_pipeline",
            IDM_SRC_DIR / "tryon_pipeline.py",
        )

        UNet2DConditionModel = unet_hacked_tryon.UNet2DConditionModel
        UNet2DConditionModel_ref = unet_hacked_garmnet.UNet2DConditionModel
        TryonPipeline = tryon_pipeline.StableDiffusionXLInpaintPipeline

        print("1. Loading scheduler")
        scheduler = DDPMScheduler.from_pretrained(IDM_CKPT_DIR, subfolder="scheduler")
        print("2. Loading VAE")
        vae = AutoencoderKL.from_pretrained(
            IDM_CKPT_DIR, subfolder="vae", torch_dtype=dtype
        )
        print("3. Loading UNet")
        unet = UNet2DConditionModel.from_pretrained(
            IDM_CKPT_DIR, subfolder="unet", torch_dtype=dtype
        )
        print("4. Loading image encoder")
        image_encoder = CLIPVisionModelWithProjection.from_pretrained(
            IDM_CKPT_DIR, subfolder="image_encoder", torch_dtype=dtype
        )
        print("5. Loading garment encoder")
        unet_encoder = UNet2DConditionModel_ref.from_pretrained(
            IDM_CKPT_DIR, subfolder="unet_encoder", torch_dtype=dtype
        )
        print("6. Loading text encoder 1")
        text_encoder = CLIPTextModel.from_pretrained(
            IDM_CKPT_DIR, subfolder="text_encoder", torch_dtype=dtype
        )
        print("7. Loading text encoder 2")
        text_encoder_2 = CLIPTextModelWithProjection.from_pretrained(
            IDM_CKPT_DIR, subfolder="text_encoder_2", torch_dtype=dtype
        )
        print("8. Loading tokenizer")
        tokenizer = AutoTokenizer.from_pretrained(
            IDM_CKPT_DIR, subfolder="tokenizer", use_fast=False
        )
        print("9. Loading tokenizer2")
        tokenizer_2 = AutoTokenizer.from_pretrained(
            IDM_CKPT_DIR, subfolder="tokenizer_2", use_fast=False
        )
        print("10. Building pipeline")
        pipe = TryonPipeline(
            unet=unet,
            vae=vae,
            feature_extractor=CLIPImageProcessor(),
            text_encoder=text_encoder,
            text_encoder_2=text_encoder_2,
            tokenizer=tokenizer,
            tokenizer_2=tokenizer_2,
            scheduler=scheduler,
            image_encoder=image_encoder,
            unet_encoder=unet_encoder,
        )
        # T4 headroom: slice VAE decode; avoid keeping unused grads.
        if hasattr(pipe, "enable_vae_slicing"):
            pipe.enable_vae_slicing()
        for module in (unet, vae, image_encoder, unet_encoder, text_encoder, text_encoder_2):
            module.requires_grad_(False)

        print("11. Moving to device")
        pipe = pipe.to(device)
        self.pipe = pipe
        self._tensor_transform = transforms.Compose(
            [
                transforms.ToTensor(),
                transforms.Normalize([0.5], [0.5]),
            ]
        )
        models.register_idm(self)
        elapsed = time.time() - start
        print(f"IDM-VTON Loaded in {elapsed:.2f} sec")
        print(f"VRAM after IDM load: {vram_snapshot()}")
        return self.pipe

    def release(self):
        self.pipe = None
        self._tensor_transform = None
        gc.collect()
        empty_cache()

    def run(
        self,
        person_image: str | Path | Image.Image,
        garment_image: str | Path | Image.Image,
        mask_path: str | Path | Image.Image,
        prompt: str | None = None,
        pose_image: str | Path | Image.Image | None = None,
        garment=None,
        num_inference_steps: int = DEFAULT_STEPS,
        guidance_scale: float = DEFAULT_GUIDANCE,
        seed: int | None = 42,
    ):
        import torch

        if self.pipe is None:
            raise ProviderUnavailable(
                "idm_not_loaded",
                "IDM-VTON model not loaded.",
            )
        if current_device() != "cuda":
            raise ProviderUnavailable(
                "cuda_required",
                "IDM-VTON inference requires CUDA.",
            )

        device = current_device()
        dtype = torch.float16
        garment_des = prompt or garment_description(garment)

        if isinstance(person_image, (str, Path)):
            person = _resize_rgb(Image.open(person_image))
        else:
            person = _resize_rgb(person_image)

        if isinstance(garment_image, (str, Path)):
            garment_pil = _resize_rgb(Image.open(garment_image))
        else:
            garment_pil = _resize_rgb(garment_image)

        if isinstance(mask_path, (str, Path)):
            mask = validate_mask_image(Image.open(mask_path), source="idm")
        else:
            mask = validate_mask_image(mask_path, source="idm")

        if pose_image is None:
            raise ProviderUnavailable(
                "densepose_missing",
                "IDM-VTON requires DensePose pose_img. Generate it before loading IDM on T4.",
            )
        if isinstance(pose_image, (str, Path)):
            pose_pil = _resize_rgb(Image.open(pose_image))
        else:
            pose_pil = _resize_rgb(pose_image)

        if pose_pil.size != IDM_SIZE:
            pose_pil = pose_pil.resize(IDM_SIZE, Image.Resampling.LANCZOS)

        assert self._tensor_transform is not None
        pipe = self.pipe

        person_prompt = f"model is wearing {garment_des}"
        cloth_prompt = f"a photo of {garment_des}"

        try:
            with torch.inference_mode():
                (
                    prompt_embeds,
                    negative_prompt_embeds,
                    pooled_prompt_embeds,
                    negative_pooled_prompt_embeds,
                ) = pipe.encode_prompt(
                    person_prompt,
                    num_images_per_prompt=1,
                    do_classifier_free_guidance=True,
                    negative_prompt=NEGATIVE_PROMPT,
                )
                (
                    prompt_embeds_c,
                    _,
                    _,
                    _,
                ) = pipe.encode_prompt(
                    [cloth_prompt],
                    num_images_per_prompt=1,
                    do_classifier_free_guidance=False,
                    negative_prompt=[NEGATIVE_PROMPT],
                )

                pose_tensor = (
                    self._tensor_transform(pose_pil)
                    .unsqueeze(0)
                    .to(device, dtype)
                )
                cloth_tensor = (
                    self._tensor_transform(garment_pil)
                    .unsqueeze(0)
                    .to(device, dtype)
                )
                generator = (
                    torch.Generator(device).manual_seed(seed)
                    if seed is not None
                    else None
                )

                output = pipe(
                    prompt_embeds=prompt_embeds.to(device, dtype),
                    negative_prompt_embeds=negative_prompt_embeds.to(device, dtype),
                    pooled_prompt_embeds=pooled_prompt_embeds.to(device, dtype),
                    negative_pooled_prompt_embeds=negative_pooled_prompt_embeds.to(
                        device, dtype
                    ),
                    num_inference_steps=num_inference_steps,
                    generator=generator,
                    strength=1.0,
                    pose_img=pose_tensor,
                    text_embeds_cloth=prompt_embeds_c.to(device, dtype),
                    cloth=cloth_tensor,
                    mask_image=mask,
                    image=person,
                    height=IDM_SIZE[1],
                    width=IDM_SIZE[0],
                    ip_adapter_image=garment_pil,
                    guidance_scale=guidance_scale,
                )
        except RuntimeError as error:
            if _is_oom(error):
                empty_cache()
                raise ProviderUnavailable(
                    "gpu_oom",
                    "IDM-VTON ran out of GPU memory. Unload other models and retry on T4 (~15 GB).",
                ) from error
            raise ProviderUnavailable(
                "idm_inference_failed",
                f"IDM-VTON inference failed: {str(error)[:300]}",
            ) from error
        except Exception as error:
            if _is_oom(error):
                empty_cache()
                raise ProviderUnavailable(
                    "gpu_oom",
                    "IDM-VTON ran out of GPU memory during inference.",
                ) from error
            raise ProviderUnavailable(
                "idm_inference_failed",
                f"IDM-VTON inference failed: {str(error)[:300]}",
            ) from error

        images = getattr(output, "images", None) or output[0]
        result = images[0]
        if not isinstance(result, Image.Image):
            raise ProviderUnavailable(
                "idm_output_invalid",
                "IDM-VTON did not return a PIL image.",
            )
        if result.size[0] < 8 or result.size[1] < 8:
            raise ProviderUnavailable(
                "idm_output_invalid",
                f"IDM-VTON output dimensions are invalid: {result.size}.",
            )
        return result.convert("RGB")


idm = IDMLoader()
