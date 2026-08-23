import sys
import time
import importlib.util

from PIL import Image

from models.model_manager import (
    IDM_CKPT_DIR,
    IDM_SRC_DIR,
    current_device,
    idm_weights_present,
    models,
)
from runtime.provider_errors import ProviderUnavailable


IDM_ROOT_DIR = IDM_SRC_DIR.parent
IDM_SIZE = (768, 1024)


def _import_from_path(module_name, file_path):

    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _resize(image: Image.Image, size=IDM_SIZE) -> Image.Image:
    if image.size == size:
        return image
    return image.resize(size, Image.Resampling.LANCZOS)


class IDMLoader:

    def __init__(self):

        self.pipe = None

    def load(self):

        if self.pipe is not None:
            return self.pipe

        if not idm_weights_present():
            raise ProviderUnavailable(
                "idm_weights_missing",
                f"IDM-VTON checkpoints or sources are incomplete at {IDM_ROOT_DIR}.",
            )

        models.ensure_vram_for("idm")

        import torch
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
        dtype = torch.float16 if device == "cuda" else torch.float32

        unet_hacked_tryon = _import_from_path(
            "unet_hacked_tryon",
            IDM_SRC_DIR / "unet_hacked_tryon.py"
        )

        unet_hacked_garmnet = _import_from_path(
            "unet_hacked_garmnet",
            IDM_SRC_DIR / "unet_hacked_garmnet.py"
        )

        tryon_pipeline = _import_from_path(
            "tryon_pipeline",
            IDM_SRC_DIR / "tryon_pipeline.py"
        )

        UNet2DConditionModel = unet_hacked_tryon.UNet2DConditionModel
        UNet2DConditionModel_ref = unet_hacked_garmnet.UNet2DConditionModel
        TryonPipeline = tryon_pipeline.StableDiffusionXLInpaintPipeline
        print("1. Loading scheduler")
        scheduler = DDPMScheduler.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="scheduler"
        )
        print("2. Loading VAE")
        vae = AutoencoderKL.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="vae",
            torch_dtype=dtype
        )
        print("3. Loading UNet")
        unet = UNet2DConditionModel.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="unet",
            torch_dtype=dtype
        )
        print("4. Loading image encoder")
        image_encoder = CLIPVisionModelWithProjection.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="image_encoder",
            torch_dtype=dtype
        )
        print("5. Loading garment encoder")
        unet_encoder = UNet2DConditionModel_ref.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="unet_encoder",
            torch_dtype=dtype
        )
        print("6. Loading text encoder 1")
        text_encoder = CLIPTextModel.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="text_encoder",
            torch_dtype=dtype
        )
        print("7. Loading text encoder 2")
        text_encoder_2 = CLIPTextModelWithProjection.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="text_encoder_2",
            torch_dtype=dtype
        )
        print("8. Loading tokenizer")
        tokenizer = AutoTokenizer.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="tokenizer",
            use_fast=False,
        )
        print("9. Loading tokenizer2")
        tokenizer_2 = AutoTokenizer.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="tokenizer_2",
            use_fast=False,
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
            unet_encoder=unet_encoder
        )
        print("11. Moving to device")
        pipe = pipe.to(device)
        print("12. Done")
        self.pipe = pipe

        models.register_idm(self)

        elapsed = time.time() - start

        print(
            f"IDM-VTON Loaded in {elapsed:.2f} sec"
        )

        return self.pipe

    def release(self):
        self.pipe = None

    def run(
        self,
        person_image: str,
        garment_image: str,
        mask_path: str,
        prompt: str = "a photo of a person wearing the garment",
    ):
        import torch

        if self.pipe is None:
            raise ProviderUnavailable(
                "idm_not_loaded",
                "IDM-VTON model not loaded.",
            )

        person = _resize(Image.open(person_image).convert("RGB"))
        garment = _resize(Image.open(garment_image).convert("RGB"))
        mask = _resize(Image.open(mask_path).convert("L"))

        kwargs = {
            "image": person,
            "cloth": garment,
            "mask_image": mask,
            "num_inference_steps": 30,
            "guidance_scale": 2.0,
            "height": IDM_SIZE[1],
            "width": IDM_SIZE[0],
            "prompt": prompt,
        }

        with torch.inference_mode():
            try:
                output = self.pipe(**kwargs)
            except TypeError:
                output = self.pipe(
                    image=person,
                    cloth=garment,
                    mask_image=mask,
                    num_inference_steps=30,
                    guidance_scale=2.0,
                )

        return output.images[0]


idm = IDMLoader()
