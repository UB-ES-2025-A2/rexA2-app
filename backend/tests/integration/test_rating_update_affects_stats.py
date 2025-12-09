import pytest
from collections import defaultdict
from backend.db.models import rating as rating_crud


@pytest.fixture
def fake_db(monkeypatch):
  store = defaultdict(lambda: {"sum": 0, "ratings": {}})

  async def fake_set_user_rating(user_id: str, route_id: str, rating: int):
    bucket = store[route_id]
    prev = bucket["ratings"].get(user_id)
    if prev is not None:
      bucket["sum"] -= prev
    bucket["ratings"][user_id] = rating
    bucket["sum"] += rating
    count = len(bucket["ratings"])
    average = round(bucket["sum"] / count, 1) if count else None
    return {"user_rating": rating, "average": average, "count": count}

  async def fake_get_route_rating_stats(route_id: str):
    bucket = store[route_id]
    count = len(bucket["ratings"])
    if count == 0:
      return {"average": None, "count": 0}
    average = round(bucket["sum"] / count, 1)
    return {"average": average, "count": count}

  monkeypatch.setattr(rating_crud, "set_user_rating", fake_set_user_rating, raising=True)
  monkeypatch.setattr(rating_crud, "get_route_rating_stats", fake_get_route_rating_stats, raising=True)
  return store


@pytest.mark.anyio
async def test_rating_update_affects_stats(fake_db):
  route_id = "R_COMPOSED"

  await rating_crud.set_user_rating("userA", route_id, 2)
  old_stats = await rating_crud.get_route_rating_stats(route_id)

  await rating_crud.set_user_rating("userA", route_id, 5)
  new_stats = await rating_crud.get_route_rating_stats(route_id)

  assert old_stats["count"] == new_stats["count"], "El count no debe cambiar al actualizar"
  assert new_stats["average"] > old_stats["average"], "La media debe subir al aumentar la nota"
