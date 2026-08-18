from pathlib import Path

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


_pose = None


def _get_pose():
    global _pose

    if _pose is None:
        if not MODEL_PATH.exists():
            raise RuntimeError(f"Pose model is missing at {MODEL_PATH}")

        options = vision.PoseLandmarkerOptions(
            base_options=BaseOptions(
                model_asset_path=str(MODEL_PATH)
            ),
            running_mode=vision.RunningMode.IMAGE,
        )
        _pose = vision.PoseLandmarker.create_from_options(options)

    return _pose


LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_HIP = 23
RIGHT_HIP = 24


def _orientation_from_landmarks(landmarks):

    ls = landmarks[LEFT_SHOULDER]
    rs = landmarks[RIGHT_SHOULDER]

    lh = landmarks[LEFT_HIP]
    rh = landmarks[RIGHT_HIP]

    shoulder_width = abs(ls.x - rs.x)
    hip_width = abs(lh.x - rh.x)

    width = (shoulder_width + hip_width) / 2

    shoulder_depth = abs(ls.z - rs.z)
    hip_depth = abs(lh.z - rh.z)

    depth = (shoulder_depth + hip_depth) / 2

    if width > depth * 3:

        orientation = "front"

        confidence = min(
            1.0,
            width / (depth + 1e-6) / 5
        )

    elif depth > width * 3:

        if ls.z < rs.z:
            orientation = "left"
        else:
            orientation = "right"

        confidence = min(
            1.0,
            depth / (width + 1e-6) / 5
        )

    else:

        orientation = "unknown"

        confidence = 0.5

    return orientation, confidence


def detect_pose(image_path: str):

    image = mp.Image.create_from_file(
        image_path
    )

    result = _get_pose().detect(image)

    if len(result.pose_landmarks) == 0:
        return None

    pose = result.pose_landmarks[0]

    orientation, confidence = (
        _orientation_from_landmarks(
            pose
        )
    )

    landmarks = []

    for landmark in pose:

        landmarks.append(
            {
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility,
            }
        )

    return {
        "orientation": orientation,
        "confidence": confidence,
        "landmarks": landmarks,
    }