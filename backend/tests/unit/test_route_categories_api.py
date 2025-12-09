import pytest
from httpx import AsyncClient
from datetime import datetime, timezone

@pytest.mark.anyio
async def test_filter_routes_by_category(ac: AsyncClient, monkeypatch):
    from backend.db.models import route as route_crud

    base = {
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "description": "desc",
        "category": "naturaleza",
        "owner_id": "u1",
        "created_at": datetime.now(timezone.utc),
        "images": [],
        "is_completed": False,
    }

    async def fake_get_all_routes(public_only: bool = True):
        assert public_only is True
        return [{**base, "_id": "R_NATURE", "name": "Ruta verde"}]

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)

    res = await ac.get("/routes?category=naturaleza")
    assert res.status_code == 200
    assert res.json()[0]["id"] == "R_NATURE"
