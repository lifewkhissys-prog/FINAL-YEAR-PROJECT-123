import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./devlab.db")
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    UPSTASH_REDIS_REST_URL: str = Field(default="")
    UPSTASH_REDIS_REST_TOKEN: str = Field(default="")

    # JWT Config
    SECRET_KEY: str = Field(default="devlabsecretkeychangeinproduction12345")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)  # 24 hours

    # Groq API — model-per-task configuration
    GROQ_API_KEY: str = Field(default="")
    GROQ_SCORER_MODEL: str = Field(default="openai/gpt-oss-120b")
    GROQ_VERIFIER_MODEL: str = Field(default="openai/gpt-oss-20b")
    GROQ_SYNTHESIS_MODEL: str = Field(default="openai/gpt-oss-120b")
    GROQ_FAST_MODEL: str = Field(default="openai/gpt-oss-20b")
    GROQ_VISION_MODEL: str = Field(default="llama-3.2-11b-vision-preview")

    # AgentRouter / Claude API configuration
    AGENTROUTER_API_KEY: str = Field(default="")
    AGENTROUTER_BASE_URL: str = Field(default="https://agentrouter.org/v1")
    AGENTROUTER_MODEL: str = Field(default="claude-opus-5")


    CLOUDINARY_URL: str = Field(default="")
    THESIS_UPLOAD_MAX_MB: int = Field(default=20)



    # Embedding model (sentence-transformers compatible name)
    EMBEDDING_MODEL: str = Field(default="BAAI/bge-small-en-v1.5")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

