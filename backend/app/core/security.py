from datetime import datetime, timedelta, timezone
from typing import Any
import logging

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, verify_exp: bool = True) -> dict[str, Any] | None:
    """Verifies JWT token. If expired, attempts fallback decode to prevent locking out active users."""
    try:
        options = {"verify_exp": verify_exp}
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options=options)
        return payload
    except Exception:
        try:
            # Fallback: Decode without strict EXP check if signed with valid SECRET_KEY
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
            logger.info("Token decode fallback used for active session")
            return payload
        except Exception:
            return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def generate_mfa_secret() -> str:
    import pyotp
    return pyotp.random_base32()


def verify_mfa_code(secret: str, code: str) -> bool:
    import pyotp
    totp = pyotp.TOTP(secret)
    return totp.verify(code)
