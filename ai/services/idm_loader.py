"""Legacy IDM import path. Runtime inference uses models.idm_loader."""

import sys
import time

import torch

from diffusers import (
    AutoencoderKL,
    DDPMScheduler,
)

from transformers import (
    AutoTokenizer,
    CLIPImageProcessor,
    CLIPVisionModelWithProjection,
    CLIPTextModel,
    CLIPTextModelWithProjection,
)

from models.model_manager import (
    IDM_ROOT_DIR,
    IDM_CKPT_DIR,
    models,
)


# Make IDM-VTON importable
sys.path.insert(0, str(IDM_ROOT_DIR))

from src.unet_hacked_tryon import UNet2DConditionModel
from src.unet_hacked_garmnet import (
    UNet2DConditionModel as UNet2DConditionModel_ref,
)
from src.tryon_pipeline import (
    StableDiffusionXLInpaintPipeline as TryonPipeline,
)


DEVICE = (
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

DTYPE = (
    torch.float16
    if DEVICE == "cuda"
    else torch.float32
)


class IDMLoader:

    def __init__(self):

        self.pipeline = None

    def load(self):

        if self.pipeline is not None:
            return

        print("Loading IDM-VTON...")

        start = time.time()

        scheduler = DDPMScheduler.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="scheduler",
        )
        print("Scheduler Loaded")
        vae = AutoencoderKL.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="vae",
            torch_dtype=DTYPE,
        )
        print("VAE Loaded")
        unet = UNet2DConditionModel.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="unet",
            torch_dtype=DTYPE,
        )
        print("UNet Loaded")
        image_encoder = (
            CLIPVisionModelWithProjection.from_pretrained(
                IDM_CKPT_DIR,
                subfolder="image_encoder",
                torch_dtype=DTYPE,
            )
        )
        print("Image Encoder Loaded")
        unet_encoder = (
            UNet2DConditionModel_ref.from_pretrained(
                IDM_CKPT_DIR,
                subfolder="unet_encoder",
                torch_dtype=DTYPE,
            )
        )
        print("Garment UNet Loaded")
        text_encoder = CLIPTextModel.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="text_encoder",
            torch_dtype=DTYPE,
        )
        print("Text Encoder 1 Loaded")
        text_encoder_2 = (
            CLIPTextModelWithProjection.from_pretrained(
                IDM_CKPT_DIR,
                subfolder="text_encoder_2",
                torch_dtype=DTYPE,
            )
        )
        print("Text Encoder 2 Loaded")
        tokenizer = AutoTokenizer.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="tokenizer",
            use_fast=False,
        )
        print("Tokenizer 1 Loaded")
        tokenizer_2 = AutoTokenizer.from_pretrained(
            IDM_CKPT_DIR,
            subfolder="tokenizer_2",
            use_fast=False,
        )
        print("Tokenizer 2 Loaded")
        self.pipeline = TryonPipeline.from_pretrained(
            IDM_CKPT_DIR,
            unet=unet,
            vae=vae,
            scheduler=scheduler,
            feature_extractor=CLIPImageProcessor(),
            text_encoder=text_encoder,
            text_encoder_2=text_encoder_2,
            tokenizer=tokenizer,
            tokenizer_2=tokenizer_2,
            image_encoder=image_encoder,
            unet_encoder=unet_encoder,
            torch_dtype=DTYPE,
        ).to(DEVICE)
        print("Creating Pipeline...")
        models.register_idm(self)
        print("Pipeline Created")
        print(
            f"IDM-VTON Loaded in {time.time()-start:.2f} sec"
        )


idm = IDMLoader()