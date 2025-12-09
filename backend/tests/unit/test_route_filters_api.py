import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.anyio
async def test_filter_routes_by_distance(ac: AsyncClient, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_all_routes(public_only: bool = True):
        assert public_only is True  # el endpoint siempre pide rutas públicas
        base = {
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "desc",
            "category": "cat",
            "owner_id": "u1",
            "created_at": datetime.now(timezone.utc),
            "images": [],
            "is_completed": False,
        }
        return [{**base, "_id": "R1", "name": "R1"}, {**base, "_id": "R2", "name": "R2"}]

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)

    res = await ac.get("/routes?distance_min=0&distance_max=5")
    assert res.status_code == 200
    assert len(res.json()) == 2


@pytest.mark.anyio
async def test_filter_routes_by_duration(ac: AsyncClient, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_all_routes(public_only: bool = True):
        assert public_only is True
        base = {
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "desc",
            "category": "cat",
            "owner_id": "u1",
            "created_at": datetime.now(timezone.utc),
            "images": [],
            "is_completed": False,
        }
        return [{**base, "_id": "R_A", "name": "R_A"}, {**base, "_id": "R_B", "name": "R_B"}]

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)

    res = await ac.get("/routes?duration_min=60&duration_max=180")
    assert res.status_code == 200
    assert len(res.json()) == 2
