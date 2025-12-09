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
async def test_filters_combined_distance_duration(fake_db):
    # Ruta corta ~2.2 km, 45 min
    await route_crud.create_route("u1", {
        "name": "Corta",
        "duration_minutes": 45,
        "points": [
            {"latitude": 0, "longitude": 0},
            {"latitude": 0.01, "longitude": 0},
            {"latitude": 0.02, "longitude": 0},
        ],
        "description": "Ruta breve",
        "category": "ciudad",
    })
    # Ruta larga ~222 km, 200 min
    await route_crud.create_route("u1", {
        "name": "Larga",
        "duration_minutes": 200,
        "points": [
            {"latitude": 0, "longitude": 0},
            {"latitude": 1, "longitude": 0},
            {"latitude": 2, "longitude": 0},
        ],
        "description": "Ruta extensa",
        "category": "ciudad",
    })

    all_routes = await route_crud.get_all_routes(public_only=False)
    results = [
        r for r in all_routes
        if (r.get("distance_km") is None or r["distance_km"] <= 5)
        and (r.get("duration_minutes") is None or r["duration_minutes"] <= 60)
    ]

    assert len(results) == 1
    assert results[0]["name"] == "Corta"
