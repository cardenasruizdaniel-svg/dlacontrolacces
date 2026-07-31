import pytest
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token


def test_password_hashing():
    password = "SecurePassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_tokens():
    data = {"sub": "user-123", "role": "admin"}
    access_token = create_access_token(data)
    assert access_token is not None
    
    payload = verify_token(access_token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"


def test_refresh_token():
    data = {"sub": "user-123"}
    refresh_token = create_refresh_token(data)
    assert refresh_token is not None
    
    payload = verify_token(refresh_token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["type"] == "refresh"
