from utils.logger import logger


class ModelManager:
    def __init__(self):
        self.florence = None
        self.sam2 = None
        self.densepose = None
        self.idm = None

    @property
    def is_loaded(self):
        return (
            self.florence is not None
            and self.sam2 is not None
            and self.densepose is not None
            and self.idm is not None
        )

    def load_all(self):
        logger.info("Starting model loading...")

        # These will be implemented one by one
        # self.florence = ...
        # self.sam2 = ...
        # self.densepose = ...
        # self.idm = ...

        logger.info("Model loading finished.")


model_manager = ModelManager()