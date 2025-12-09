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
