from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    environment: str = 'development'
    database_url: str = 'sqlite:///./media_ops.db'
    redis_url: str = 'redis://localhost:6379/0'
    demo_enabled: bool = False
    google_client_id: str = ''
    google_client_secret: str = ''
    google_redirect_uri: str = 'http://localhost:8000/api/v1/auth/callback'
    mobile_redirect_uri: str = 'mediaops://auth'
    encryption_key: str = ''
    admin_email: str = ''
    workspace_timezone: str = 'Asia/Kolkata'
    source_retention_days: int = 90
    allowed_domain: str = ''
    cors_origins: str = 'http://localhost:8081,http://localhost:8082'
    @model_validator(mode='after')
    def validate_environment(self):
        if self.environment == 'production':
            if self.demo_enabled or not self.encryption_key or not self.admin_email:
                raise ValueError('Production requires encryption/admin configuration and forbids demo mode')
            if not (self.database_url.startswith('postgresql') or self.database_url.startswith('postgres')) or (not self.google_redirect_uri.startswith('https://') and not self.google_redirect_uri.startswith('http://localhost') and not self.google_redirect_uri.startswith('http://127.0.0.1')):
                raise ValueError('Production requires PostgreSQL and HTTPS (or localhost) OAuth redirect')
        return self
