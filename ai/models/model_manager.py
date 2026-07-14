from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

WEIGHTS_DIR = BASE_DIR / "weights"

FLORENCE_MODEL = "microsoft/Florence-2-base"

SAM2_DIR = WEIGHTS_DIR / "sam2"

IDM_DIR = WEIGHTS_DIR / "idm-vton"

POSE_MODEL = WEIGHTS_DIR / "pose_landmarker_lite.task"


class ModelManager:

    def __init__(self):

        self.florence = None
        self.sam2 = None
        self.idm = None

    def register_florence(self, loader):

        self.florence = loader

    def info(self):

        return {
            "florence": {
                "model": FLORENCE_MODEL,
                "loaded": self.florence is not None
            },
            "sam2": {
                "weights": SAM2_DIR.exists(),
                "loaded": self.sam2 is not None
            },
            "idm": {
                "weights": IDM_DIR.exists(),
                "loaded": self.idm is not None
            },
            "pose": {
                "weights": POSE_MODEL.exists()
            }
        }

models = ModelManager()