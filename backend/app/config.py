import re
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo
from typing import Literal
from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator, Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    environment: Literal['development', 'test', 'production'] = 'development'
    database_url: str = 'sqlite:///./media_ops.db'
    redis_url: str = 'redis://localhost:6379/0'
    demo_enabled: bool = False
    google_client_id: str = ''
    google_client_secret: str = ''
    google_redirect_uri: str = 'http://localhost:8000/api/v1/auth/callback'
    mobile_redirect_uri: str = 'mediaops://auth'
    client_redirect_uris: str = ''
    encryption_key: str = ''
    admin_email: str = ''
    workspace_timezone: str = 'Asia/Kolkata'
    source_retention_days: int = Field(default=90, ge=1, le=3650)
    allowed_domain: str = ''
    domain_auto_join: bool = False
    cors_origins: str = 'http://localhost:8081,http://localhost:8082'
    in_process_sync: bool | None = None
    rate_limit_enabled: bool | None = None
    auth_requests_per_minute: int = Field(default=30, ge=1)
    api_requests_per_minute: int = Field(default=300, ge=1)
    max_request_bytes: int = Field(default=1048576, ge=1024, le=26214400)

    @model_validator(mode='after')
    def validate_environment(self):
        try:
            ZoneInfo(self.workspace_timezone)
        except (KeyError, ValueError):
            raise ValueError('WORKSPACE_TIMEZONE must be a valid IANA time zone')
        if self.encryption_key:
            try:
                Fernet(self.encryption_key.encode())
            except (ValueError, TypeError):
                raise ValueError('ENCRYPTION_KEY must be a valid Fernet key')
        self.allowed_domain = self.allowed_domain.strip().lower()
        if self.domain_auto_join:
            if not re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}', self.allowed_domain):
                raise ValueError('DOMAIN_AUTO_JOIN requires an explicit ALLOWED_DOMAIN')
            if not self.admin_email or self.admin_email.strip().lower().rsplit('@', 1)[-1] != self.allowed_domain:
                raise ValueError('DOMAIN_AUTO_JOIN requires ADMIN_EMAIL within ALLOWED_DOMAIN')
        production = self.environment == 'production'
        if self.in_process_sync is None:
            self.in_process_sync = self.environment == 'development'
        if self.rate_limit_enabled is None:
            self.rate_limit_enabled = production
        if production:
            if self.demo_enabled or not self.encryption_key or not self.admin_email:
                raise ValueError('Production requires encryption/admin configuration and forbids demo mode')
            if not self.google_client_id or not self.google_client_secret:
                raise ValueError('Production requires Google OAuth client credentials')
            if not self.database_url.startswith(('postgresql', 'postgres://')):
                raise ValueError('Production requires PostgreSQL')
            origins = [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]
            if any(urlsplit(origin).path for origin in origins):
                raise ValueError('CORS origins must contain only the scheme and host, without paths or trailing slashes')
            for value in [self.google_redirect_uri, *origins]:
                parsed = urlsplit(value)
                if parsed.scheme != 'https' or not parsed.hostname or parsed.hostname in ('localhost', '127.0.0.1', '::1') or parsed.username or parsed.fragment or parsed.query or '*' in value:
                    raise ValueError('Production OAuth callback and CORS origins must be explicit public HTTPS URLs')
            if not origins or self.in_process_sync or not self.rate_limit_enabled:
                raise ValueError('Production requires explicit CORS origins, distributed workers and rate limiting')
        return self

    def valid_client_redirect(self, value):
        if not value:
            return True
        parsed = urlsplit(value)
        if parsed.username or parsed.password or parsed.fragment or parsed.query or '|' in value:
            return False
        exact = [self.mobile_redirect_uri, *[uri.strip() for uri in self.client_redirect_uris.split(',') if uri.strip()]]
        if value in exact:
            return True
        origin = f'{parsed.scheme}://{parsed.netloc}'
        return parsed.scheme in ('http', 'https') and origin in [item.strip() for item in self.cors_origins.split(',')]
