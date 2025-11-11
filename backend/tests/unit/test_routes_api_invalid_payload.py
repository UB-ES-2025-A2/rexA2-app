# tests/unit/test_routes_api_invalid_payload.py
import pytest

@pytest.mark.anyio
async def test_create_route_422_payload_invalido(ac, monkeypatch):
    from backend.db.models import route as route_crud

    # Stub: no hahy ruta existente con ese nombre
    async def fake_get_route_by_name(owner_id, name): 
        return None
    
    # Stub: simula creación existosa (no se usará si la validación falla antes)
    async def fake_create_route(owner_id, data): 
        return {"_id": "X", "owner_id": owner_id, **data, "created_at": "2025-01-01T00:00:00Z"}
    
    # Inyección de strubs para aislar la lógica de validación de la API
    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)
    monkeypatch.setattr(route_crud, "create_route", fake_create_route, raising=True)

    # Payload inválido: "points" tiene menos de 3 elementos --> debe fallar la validación (422)
    bad = {
        "name": "Válido",
        "points": [{"latitude": 1, "longitude": 1}],  # < 3 --> 422
        "visibility": True,
        "description": "d",
        "category": "c",
    }
    # Petición a a la API con datos inválidos
    res = await ac.post("/routes", json=bad)
    
    # Se espera un 422 Unprocessable Entity por validación
    assert res.status_code == 422
