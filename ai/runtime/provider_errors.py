class ProviderUnavailable(RuntimeError):
    """A real provider cannot run. Never substitute mock output for this."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message
