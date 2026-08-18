import sys
import time
import importlib.util
import torch
from pathlib import Path
from PIL import Image
import uuid

from models.model_manager import IDM_CKPT_DIR
from models.model_manager import IDM_SRC_DIR
from models.model_manager import models

IDM_ROOT_DIR = IDM_SRC_DIR.parent

def _import_from_path(module_name, file_path):

    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class IDMLoader:

    def __init__(self):

        self.pipe = None

    def load(self):

        if self.pipe is not None:
            return self.pipe

        required_sources = (
            IDM_SRC_DIR / "unet_hacked_tryon.py",
            IDM_SRC_DIR / "unet_hacked_garmnet.py",
            IDM_SRC_DIR / "tryon_pipeline.py",
        )
        if not IDM_CKPT_DIR.exists() or not all(
            source.exists() for source in required_sources
        ):
            print(f"IDM-VTON assets are incomplete at {IDM_ROOT_DIR}")
            return None

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

        device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        dtype = torch.float16 if torch.cuda.is_available() else torch.float32

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
            subfolder="tokenizer"
        )
        print("9. Loading tokenizer2")
        tokenizer_2 = AutoTokenizer.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="tokenizer_2"
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

        models.register_idm(self.pipe)

        elapsed = time.time() - start

        print(
            f"IDM-VTON Loaded in {elapsed:.2f} sec"
        )

        return self.pipe
    def run(
        self,
        person_image: str,
        garment_image: str,
        mask_path: str,
    ):

        if self.pipe is None:
            raise RuntimeError(
                "IDM-VTON model not loaded."
            )

        person = Image.open(person_image).convert("RGB")
        garment = Image.open(garment_image).convert("RGB")
        mask = Image.open(mask_path).convert("L")

        with torch.inference_mode():
            output = self.pipe(
                image=person,
                cloth=garment,
                mask_image=mask,
                num_inference_steps=30,
                guidance_scale=2.0,
            )

        result = output.images[0]

        output_dir = (
            Path(__file__).resolve().parents[1] /
            "public" /
            "uploads" /
            "generated"
        )

        output_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        filename = f"{uuid.uuid4()}.png"

        path = output_dir / filename

        result.save(path)

        return {
            "image_path": str(path),
            "image_url": f"/uploads/generated/{filename}"
        }

idm = IDMLoader()