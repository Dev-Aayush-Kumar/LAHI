import os
os.environ["FLASH_ATTENTION_SKIP_IMPORT_CHECK"] = "1"
from pathlib import Path

from transformers import AutoProcessor
from transformers import AutoModelForCausalLM

from models.model_manager import FLORENCE_MODEL
from models.model_manager import models

import time

class FlorenceLoader:

    def __init__(self):

        self.processor = None
        self.model = None

    def load(self):

        if self.model is not None:
            return

        start = time.time()

        print("Loading Florence-2...")

        self.processor = AutoProcessor.from_pretrained(
            FLORENCE_MODEL,
            trust_remote_code=True
        )

        self.model = AutoModelForCausalLM.from_pretrained(
            FLORENCE_MODEL,
            trust_remote_code=True,
            attn_implementation="eager"
        )

        models.register_florence(self)

        elapsed = time.time() - start

        print(
            f"Florence-2 Loaded in {elapsed:.2f} sec"
        )


florence = FlorenceLoader()