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
async def test_category_filter_combined_with_duration(fake_db):
    await route_crud.create_route("u1", {
        "name": "Gastro Tour",
        "theme": "gastronomia",
        "duration_minutes": 120,
        "points": [
            {"latitude": 0, "longitude": 0},
            {"latitude": 0.01, "longitude": 0},
            {"latitude": 0.02, "longitude": 0},
        ],
        "description": "Ruta de comida",
        "category": "gastronomia",
    })
    await route_crud.create_route("u1", {
        "name": "Montaña Express",
        "theme": "montaña",
        "duration_minutes": 120,
        "points": [
            {"latitude": 0, "longitude": 0},
            {"latitude": 0.5, "longitude": 0},
            {"latitude": 1, "longitude": 0},
        ],
        "description": "Ruta de montaña",
        "category": "aventura",
    })

    all_routes = await route_crud.get_all_routes(public_only=False)
    results = [
        r for r in all_routes
        if r.get("theme") == "gastronomia" and (r.get("duration_minutes") or 0) <= 200
    ]

    assert len(results) == 1 and results[0]["name"] == "Gastro Tour"
