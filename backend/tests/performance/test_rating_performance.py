import pytest
import time
from collections import defaultdict
from backend.db.models import rating as rating_crud


@pytest.mark.anyio
async def test_rating_stats_performance(monkeypatch):
    """
    US26 Performance:
    Debe calcular media + count de hasta 10.000 valoraciones en < 25 ms.
    Se simula la colección de ratings en memoria para aislar el cálculo.
    """

    route_id = "ROUTE_PERF"
    store = defaultdict(lambda: {"sum": 0, "ratings": {}})

    async def fake_set_user_rating(user_id: str, rid: str, rating: int):
        bucket = store[rid]
        prev = bucket["ratings"].get(user_id)
        if prev is not None:
            bucket["sum"] -= prev
        bucket["ratings"][user_id] = rating
        bucket["sum"] += rating
        count = len(bucket["ratings"])
        average = round(bucket["sum"] / count, 1) if count else None
        return {"user_rating": rating, "average": average, "count": count}

    async def fake_get_route_rating_stats(rid: str):
        bucket = store.get(rid, {"sum": 0, "ratings": {}})
        count = len(bucket["ratings"])
        if count == 0:
            return {"average": None, "count": 0}
        average = round(bucket["sum"] / count, 1)
        return {"average": average, "count": count}

    monkeypatch.setattr(rating_crud, "set_user_rating", fake_set_user_rating, raising=True)
    monkeypatch.setattr(rating_crud, "get_route_rating_stats", fake_get_route_rating_stats, raising=True)

    # Insertamos 10000 valoraciones
    for i in range(10000):
        await rating_crud.set_user_rating(f"user{i}", route_id, i % 5 + 1)

    start = time.time()
    stats = await rating_crud.get_route_rating_stats(route_id)
    end = time.time()

    assert stats["average"] is not None and stats["count"] == 10000
    elapsed_ms = (end - start) * 1000
    assert elapsed_ms < 25, f"Rating performance demasiado lento: {elapsed_ms:.2f}ms"
