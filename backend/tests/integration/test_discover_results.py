import pytest
from backend.db.models import route as route_crud


@pytest.fixture
def fake_db(monkeypatch):
    from backend.tests.unit.test_routes_crud import FakeDB
    import backend.db.client as db_client

    db = FakeDB()
    monkeypatch.setattr(db_client, "db", db, raising=True)
    return db


@pytest.mark.anyio
async def test_discover_returns_minimum_data(fake_db):
    await route_crud.create_route("u", {
        "name": "Costa Sur",
        "theme": "costa",
        "distance_km": 8,
        "rating": 4.5,
        "points": [
            {"latitude": 0, "longitude": 0},
            {"latitude": 0.01, "longitude": 0},
            {"latitude": 0.02, "longitude": 0},
        ],
        "description": "Ruta de costa",
        "category": "costa",
    })

    all_routes = await route_crud.get_all_routes(public_only=False)
    data = {}
    for r in all_routes:
        theme = r.get("theme") or r.get("category") or "otros"
        data.setdefault(theme, []).append(r)

    assert "costa" in data
    r = data["costa"][0]
    assert "name" in r and "distance_km" in r and "rating" in r
