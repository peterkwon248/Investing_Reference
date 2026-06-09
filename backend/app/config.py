from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "투자만능계산기 API"
    version: str = "6.0.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/investment_calc"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@db:5432/investment_calc"

    # Redis
    redis_url: str = "redis://redis:6379/0"
    cache_ttl: int = 300  # 5 minutes default

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost"]

    # External APIs
    dart_api_key: str = ""
    openai_api_key: str = ""

    # Selenium
    selenium_url: str = "http://chrome:4444/wd/hub"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
