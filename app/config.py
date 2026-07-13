from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/devlab")
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    
    # JWT Config
    SECRET_KEY: str = Field(default="devlabsecretkeychangeinproduction12345")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440) # 24 hours
    
    # Thesis Critique (Groq) Config
    GROQ_API_KEY: str = Field(default="gsk_placeholder")
    GROQ_MODEL: str = Field(default="llama3-70b-8192")
    THESIS_UPLOAD_MAX_MB: int = Field(default=20)
    
    # Judge0 Config
    # Default is localhost:2358, which is the standard default port for a self-hosted Judge0 instance
    JUDGE0_API_URL: str = Field(default="http://localhost:2358")
    JUDGE0_API_KEY: str | None = Field(default=None)
    JUDGE0_USE_AUTH_HEADER: bool = Field(default=False)
    
    # Sandbox limits defaults (can be overridden by problem definitions)
    SANDBOX_CPU_QUOTA: int = Field(default=50000) # 50% CPU limit
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
