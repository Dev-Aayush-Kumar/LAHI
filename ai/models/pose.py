import mediapipe as mp
import cv2

mp_pose = mp.solutions.pose

_pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.5
)


def detect_pose(image_path: str):
    image = cv2.imread(image_path)

    if image is None:
        return None

    rgb = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2RGB
    )

    result = _pose.process(rgb)

    if result.pose_landmarks is None:
        return None

    landmarks = []

    for landmark in result.pose_landmarks.landmark:
        landmarks.append({
            "x": landmark.x,
            "y": landmark.y,
            "z": landmark.z,
            "visibility": landmark.visibility
        })

    return landmarks