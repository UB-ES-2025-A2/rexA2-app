import pytest
from httpx import AsyncClient
from datetime import datetime, timezone

@pytest.mark.anyio
async def test_share_route_public_ok(ac: AsyncClient, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        assert route_id == "SHARE_PUBLIC"
        now = datetime.now(timezone.utc)
        return {
            "_id": route_id,
            "owner_id": "u1",
            "visibility": True,
            "name": "Ruta compartida",
            "description": "Una ruta pカblica de prueba",
            "category": "ciudad",
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "created_at": now,
            "rating": 4.2,
            "rating_count": 5,
            "images": [],
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/SHARE_PUBLIC")
    assert res.status_code == 200

@pytest.mark.anyio
async def test_share_route_private_forbidden(ac: AsyncClient, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        now = datetime.now(timezone.utc)
        return {
            "_id": route_id,
            "owner_id": "u1",
            "visibility": False,
            "name": "Ruta privada",
            "description": "No accesible",
            "category": "montaヵa",
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "created_at": now,
            "rating": None,
            "rating_count": 0,
            "images": [],
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/PRIVATE_SHARE")
    assert res.status_code == 403
