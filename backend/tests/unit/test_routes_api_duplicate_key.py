# tests/unit/test_routes_api_duplicate_key.py
import pytest
from pymongo.errors import DuplicateKeyError

@pytest.mark.anyio
async def test_create_route_duplicate_key_409(ac, monkeypatch):
    from backend.db.models import route as route_crud
    # Stub: Simulamos que no existe ruta con este nombre
    async def fake_get_route_by_name(owner_id, name): 
        return None
    
    # Strub: Al crear, la BD lanza DuplicateKeyError (clave duplicada en el ínidce único)
    async def fake_create_route(owner_id, data): 
        raise DuplicateKeyError("dup")
    
    # Inyectamos los los stubs al módulo de CRUD
    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)
    monkeypatch.setattr(route_crud, "create_route", fake_create_route, raising=True)
    
    # Cuerpo de la petición que provoca el conflicto clave
    payload = {
        "name":"dup",
        "points":[{"latitude":1,"longitude":1}]*3,
        "visibility":False,"description":"d",
        "category":"c"
    }

    # Llamada a la API: intentamos crear la ruta
    res = await ac.post("/routes", json=payload)

    # La API debe responder un 409 Conflict ante Duplicate Error
    assert res.status_code == 409
