from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Data Qlean"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Paths (relative to project root)
    UPLOAD_DIR: Path = Path("data/uploads")
    WORKING_DIR: Path = Path("data/working")

    # Limits
    MAX_UPLOAD_MB: int = 50

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
