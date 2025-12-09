import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.anyio
async def test_discover_returns_collections(ac: AsyncClient, monkeypatch):
  from backend.db.models import route as route_crud

  async def fake_get_featured_by_theme(limit_per_theme=6, max_themes=10, country_filter=None, theme_filter=None):
    base = {
      "id": "r1",
      "name": "Ruta demo",
      "description": "desc",
      "category": "montaña",
      "points": [[1, 1], [1.1, 1.1], [1.2, 1.2]],
      "owner_id": "u1",
      "created_at": datetime.now(timezone.utc).isoformat(),
      "images": [],
      "rating": 4.5,
      "rating_count": 10,
      "distance_km": 5.2,
    }
    return [
      {"theme": "Montaña", "routes": [base, {**base, "id": "r2"}]},
      {"theme": "Costa", "routes": [{**base, "id": "r3", "category": "costa"}]},
    ]

  monkeypatch.setattr(route_crud, "get_featured_by_theme", fake_get_featured_by_theme, raising=True)

  res = await ac.get("/routes/discover/themes")
  assert res.status_code == 200
  data = res.json()
  themes = [b["theme"] for b in data]
  assert "Montaña" in themes and "Costa" in themes
