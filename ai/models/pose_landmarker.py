from pathlib import Path

import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python import BaseOptions

MODEL_PATH = (
    Path(__file__)
    .resolve()
    .parent.parent
    / "weights"
    / "pose_landmarker_lite.task"
)

_options = vision.PoseLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path=str(MODEL_PATH)
    ),
    running_mode=vision.RunningMode.IMAGE,
)

pose_landmarker = vision.PoseLandmarker.create_from_options(
    _options
)