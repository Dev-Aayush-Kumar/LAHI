from pathlib import Path
from PIL import Image
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python import vision

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

_pose = vision.PoseLandmarker.create_from_options(
    _options
)


def detect_pose(image_path: str):

    from PIL import Image

    print("Image path:", image_path)

    img = Image.open(image_path)

    print("PIL opened successfully")
    print("Format:", img.format)
    print("Mode:", img.mode)
    print("Size:", img.size)

    image = mp.Image.create_from_file(image_path)

    result = _pose.detect(image)

    if len(result.pose_landmarks) == 0:
        return None

    landmarks = []

    for landmark in result.pose_landmarks[0]:
        landmarks.append(
            {
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility,
            }
        )

    return landmarks