import os
os.environ["FLASH_ATTENTION_SKIP_IMPORT_CHECK"] = "1"

import time

from models.model_manager import (
    FLORENCE_MODEL,
    current_device,
    models,
)


class FlorenceLoader:

    def __init__(self):

        self.processor = None
        self.model = None

    def load(self):

        if self.model is not None:
            return

        models.ensure_vram_for("florence")
        start = time.time()

        print("Loading Florence-2...")

        from transformers import AutoModelForCausalLM, AutoProcessor

        device = current_device()
        self.processor = AutoProcessor.from_pretrained(
            FLORENCE_MODEL,
            trust_remote_code=True
        )

        self.model = AutoModelForCausalLM.from_pretrained(
            FLORENCE_MODEL,
            trust_remote_code=True,
            attn_implementation="eager"
        )

        self.model = self.model.to(device)

        models.register_florence(self)

        elapsed = time.time() - start

        print(f"Florence loaded in {elapsed:.2f}s")

    def release(self):
        self.model = None
        self.processor = None


florence = FlorenceLoader()