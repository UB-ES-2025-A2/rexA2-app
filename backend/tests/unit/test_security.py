# tests/unit/test_security.py
import pytest
from backend.core.security import create_access_token, create_refresh_token, decode_token
from backend.core.security import get_password_hash, verify_password, get_current_user
from fastapi import HTTPException
import backend.core.security as security_module

# Genera un acces token y verifica que al deocodificar:
# - "sub" corresponde al sujeto (email)
# - "type" indica que es un token de acceso
def test_access_token_roundtrip():
    t = create_access_token("user@example.com")
    data = decode_token(t)
    assert data["sub"] == "user@example.com"
    assert data["type"] == "access"

def test_refresh_token_type():
    # Genera un refresh token y comprueba que el campo 'type' sea 'refresh'
    t = create_refresh_token("user@example.com")
    data = decode_token(t)
    assert data["type"] == "refresh"

def test_decode_token_invalido():
    # Un String no JWT debe provocar una excepción
    with pytest.raises(Exception):
        decode_token("esto-no-es-un-jwt")


def test_get_password_hash_and_verify_password_ok():
    # La contraseña correcta debe verificarse correctamente contra su hash
    plain = "mi-secreto"
    hashed = get_password_hash(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True

def test_verify_password_wrong_returns_false():
    # Una contraseña incorrecta debe devolver False al verificarla
    plain = "mi-secreto"
    hashed = get_password_hash(plain)
    assert verify_password("otra-cosa", hashed) is False


class _FakeRequest:
    # Request mínimo con cookies y headers para testear get_current_user
    def __init__(self, cookies=None, headers=None):
        self.cookies = cookies or {}
        self.headers = headers or {}


@pytest.mark.anyio
async def test_get_current_user_no_token_401():
    # Sin cookie ni header Authorization -> 401 "No autenticado"
    req = _FakeRequest()
    with pytest.raises(HTTPException) as exc:
        await get_current_user(req)
    assert exc.value.status_code == 401
    assert exc.value.detail == "No autenticado"


@pytest.mark.anyio
async def test_get_current_user_token_type_not_access_401(monkeypatch):
    # Token con type != "access" -> 401 "Token inválido"
    def fake_decode(token: str) -> dict:
        assert token == "TOKEN"
        return {"sub": "user@example.com", "type": "refresh"}

    monkeypatch.setattr(security_module, "decode_token", fake_decode, raising=True)

    req = _FakeRequest(cookies={"access_token": "TOKEN"})
    with pytest.raises(HTTPException) as exc:
        await get_current_user(req)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Token inválido"


@pytest.mark.anyio
async def test_get_current_user_user_not_found_401(monkeypatch):
    from backend.db.models import user as user_crud

    def fake_decode(token: str) -> dict:
        assert token == "TOKEN"
        return {"sub": "user@example.com", "type": "access"}

    async def fake_get_user_by_email(email: str):
        assert email == "user@example.com"
        return None

    monkeypatch.setattr(security_module, "decode_token", fake_decode, raising=True)
    monkeypatch.setattr(user_crud, "get_user_by_email", fake_get_user_by_email, raising=True)

    req = _FakeRequest(cookies={"access_token": "TOKEN"})
    with pytest.raises(HTTPException) as exc:
        await get_current_user(req)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Usuario no disponible"


@pytest.mark.anyio
async def test_get_current_user_inactive_user_401(monkeypatch):
    from backend.db.models import user as user_crud

    def fake_decode(token: str) -> dict:
        assert token == "TOKEN"
        return {"sub": "user@example.com", "type": "access"}

    async def fake_get_user_by_email(email: str):
        return {
            "_id": "uid123",
            "email": email,
            "hashed_password": "hash",
            "username": "user",
            "is_active": False,
        }

    monkeypatch.setattr(security_module, "decode_token", fake_decode, raising=True)
    monkeypatch.setattr(user_crud, "get_user_by_email", fake_get_user_by_email, raising=True)

    req = _FakeRequest(cookies={"access_token": "TOKEN"})
    with pytest.raises(HTTPException) as exc:
        await get_current_user(req)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Usuario no disponible"


@pytest.mark.anyio
async def test_get_current_user_ok_returns_user(monkeypatch):
    from backend.db.models import user as user_crud

    def fake_decode(token: str) -> dict:
        assert token == "TOKEN"
        return {"sub": "user@example.com", "type": "access"}

    async def fake_get_user_by_email(email: str):
        return {
            "_id": "uid123",
            "email": email,
            "hashed_password": "hash",
            "username": "user",
            "is_active": True,
        }

    monkeypatch.setattr(security_module, "decode_token", fake_decode, raising=True)
    monkeypatch.setattr(user_crud, "get_user_by_email", fake_get_user_by_email, raising=True)

    req = _FakeRequest(cookies={"access_token": "TOKEN"})
    user = await get_current_user(req)
    assert user["email"] == "user@example.com"
    assert user["is_active"] is True
