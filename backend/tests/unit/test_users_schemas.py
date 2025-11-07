import pytest
from pydantic import ValidationError
from backend.db.schemas.user import UserCreate, UserPublic, LogIn, TokenOut


# ---------- Casos OK ----------

def test_user_create_ok():
    payload = {
        "email": "user@example.com",
        "username": "alice",
        "name": "Alice",
        "password": "S3guro!",
    }
    u = UserCreate(**payload)
    assert u.email == "user@example.com"
    assert u.username == "alice"
    assert u.name == "Alice"
    assert u.password == "S3guro!"

def test_user_public_ok():
    payload = {
        "email": "user@example.com",
        "username": "alice",
        "name": None,
        "id": "64fa0c8dbb5d2f0f12345678",
        "is_active": True,
    }
    up = UserPublic(**payload)
    assert up.id == "64fa0c8dbb5d2f0f12345678"
    assert up.is_active is True

def test_login_ok():
    l = LogIn(email="user@example.com", password="xxx")
    assert l.email == "user@example.com"
    assert l.password == "xxx"

def test_tokenout_defaults_bearer():
    t = TokenOut(access_token="a", refresh_token="b")
    assert t.token_type == "bearer"
    assert t.access_token == "a"
    assert t.refresh_token == "b"


# ---------- Validaciones que deben fallar ----------

def _assert_err_contains(err: ValidationError, text: str):
    joined = " | ".join([e.get("msg", "") for e in err.errors()])
    assert text in joined, f"'{text}' no encontrado en: {joined}"

def test_invalid_email():
    with pytest.raises(ValidationError) as exc:
        UserCreate(email="no-es-email", username="a", name=None, password="x")
    _assert_err_contains(exc.value, "value is not a valid email address")

def test_password_required():
    with pytest.raises(ValidationError) as exc:
        UserCreate(email="user@example.com", username="a", name=None, password=None)  # type: ignore[arg-type]
    _assert_err_contains(exc.value, "Input should be a valid string")
