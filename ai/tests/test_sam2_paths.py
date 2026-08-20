from pathlib import Path

from models.model_manager import (
    SAM2_DIR,
    sam2_checkpoint_path,
    sam2_config_path,
)


def test_sam2_paths_are_absolute_and_cwd_independent(tmp_path, monkeypatch):
    config = sam2_config_path()
    checkpoint = sam2_checkpoint_path()

    assert config.is_absolute()
    assert checkpoint.is_absolute()
    assert config.parent == Path(config).parent
    assert SAM2_DIR.resolve() in config.parents
    assert SAM2_DIR.resolve() in checkpoint.parents
    assert not str(config).startswith("configs/")

    monkeypatch.chdir(tmp_path)
    assert sam2_config_path() == config
    assert sam2_checkpoint_path() == checkpoint
    assert sam2_config_path() == sam2_config_path().resolve()
