"""Print or install a detectron2 wheel matching the current CUDA torch.

Colab ships a CUDA-enabled torch. The vendored detectron2 binary under
IDM-VTON gradio_demo is Linux/py3.9-specific and must NOT be used on modern
Colab runtimes. Install detectron2 from Meta's wheel index instead.

Usage:
    python scripts/detectron2_bootstrap.py          # print recommended pip line
    python scripts/detectron2_bootstrap.py --install
"""

from __future__ import annotations

import argparse
import subprocess
import sys


def wheel_index() -> str | None:
    try:
        import torch
    except ImportError:
        return None
    if not getattr(torch.version, "cuda", None):
        return None
    torch_major_minor = ".".join(torch.__version__.split(".")[:2])
    cuda_tag = torch.version.cuda.replace(".", "")
    return (
        f"https://dl.fbaipublicfiles.com/detectron2/wheels/cu{cuda_tag}/"
        f"torch{torch_major_minor}/index.html"
    )


def pip_command() -> str | None:
    index = wheel_index()
    if not index:
        return None
    return f"pip install detectron2 -f {index}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Detectron2 bootstrap for DensePose")
    parser.add_argument(
        "--install",
        action="store_true",
        help="Run the recommended pip install (Colab only)",
    )
    args = parser.parse_args()
    cmd = pip_command()
    if not cmd:
        print("CUDA torch is not available. detectron2 GPU wheels require CUDA torch.")
        return 1
    print(cmd)
    if args.install:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "detectron2", "-f", cmd.split("-f ")[1]],
            check=False,
        )
        if result.returncode != 0:
            return result.returncode
        import importlib

        importlib.import_module("detectron2")
        print("detectron2 import OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
