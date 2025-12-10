import pytest, time
from backend.db.models import route as route_crud


@pytest.fixture
def fake_db(monkeypatch):
    from backend.tests.unit.test_routes_crud import FakeDB
    import backend.db.client as db_client

    db = FakeDB()
    monkeypatch.setattr(db_client, "db", db, raising=True)
    return db


@pytest.mark.anyio
async def test_filter_category_performance(fake_db):
    for i in range(2000):
        await route_crud.create_route("u", {
            "name": f"R{i}",
            "theme": "aventura" if i % 2 == 0 else "gastronomia",
            "points": [
                {"latitude": 0, "longitude": 0},
                {"latitude": 0.01, "longitude": 0},
                {"latitude": 0.02, "longitude": 0},
            ],
            "description": "ruta",
            "category": "aventura",
        })

    start = time.time()
    all_routes = await route_crud.get_all_routes(public_only=False)
    results = [r for r in all_routes if r.get("theme") == "aventura"]
    elapsed = (time.time() - start) * 1000

    assert elapsed < 50, f"Filtro lento: {elapsed:.2f} ms"
    assert len(results) > 0


@pytest.mark.anyio
async def test_discover_filters_performance_with_many_routes(fake_db):
    for i in range(800):
        await route_crud.create_route(
            "u",
            {
                "name": f"R{i}",
                "theme": "aventura" if i % 3 else "gastro",
                "category": "aventura" if i % 5 else "gastro",
                "points": [
                    {"latitude": 40.0, "longitude": -3.7},
                    {"latitude": 40.05, "longitude": -3.7},
                ],
                "description": "ruta",
                "visibility": True,
                "duration_minutes": 120 if i % 4 else 240,
                "rating": 4.5 if i % 2 else 3.8,
                "rating_count": 10 + i,
                "country_code": "ES" if i % 4 else "FR",
                "country_name": "España" if i % 4 else "Francia",
            },
        )

    start = time.time()
    all_routes = await route_crud.get_all_routes(public_only=True)
    filtered = [
        r
        for r in all_routes
        if r.get("country_code") == "ES"
        and r.get("theme") == "aventura"
        and (r.get("distance_km") or 0) <= 15
        and (r.get("duration_minutes") or 0) <= 180
    ]
    elapsed = (time.time() - start) * 1000

    assert elapsed < 70, f"Descubrir con filtros lento: {elapsed:.2f} ms"
    assert len(filtered) > 0
