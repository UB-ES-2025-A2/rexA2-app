# tests/unit/test_security.py
import pytest
from backend.core.security import create_access_token, create_refresh_token, decode_token

# Genera un acces token y verifica que al deocodificar:
# - "sub" corresponde al sujeto (email)
# - "type" indica que es un token de acceso
def test_access_token_roundtrip():
    t = create_access_token("user@example.com")
    data = decode_token(t)
    assert data["sub"] == "user@example.com"
    assert data["type"] == "access"

def test_refresh_token_type():
    # Genera un refresh token y comprueba qu eel campo 'type' sea 'refresh'
    t = create_refresh_token("user@example.com")
    data = decode_token(t)
    assert data["type"] == "refresh"

def test_decode_token_invalido():
    # Un String no JWT debe provoacr una excepción
    with pytest.raises(Exception):
        decode_token("esto-no-es-un-jwt")
