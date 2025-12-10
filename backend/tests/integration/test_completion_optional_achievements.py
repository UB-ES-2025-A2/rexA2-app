import pytest

from backend.db.models import achievement as achievement_crud
from backend.db.models import completion as completion_crud
from backend.db.models import route as route_crud


@pytest.mark.anyio
async def test_completion_adds_optional_unlocks(ac, monkeypatch):
    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    async def fake_mark_completed(user_id, route_id):
        return None

    base = {
        "name": "Achievement",
        "description": "desc",
        "category": "completed_routes",
        "threshold_value": 1,
        "current_value": 1,
        "unlocked": True,
    }

    async def fake_recalc_main(user_id: str):
        return [{**base, "code": "main_unlock"}]

    async def fake_recalc_optional(user_id: str):
        return [
            {**base, "code": "optional_unlock", "category": "theme"},
            {**base, "code": "optional_unlock", "category": "distance"},
        ]

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "mark_completed", fake_mark_completed, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_completed_routes_achievements", fake_recalc_main, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_theme_achievements", fake_recalc_optional, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_distance_achievements", fake_recalc_optional, raising=True)

    res = await ac.post("/routes/abc123/completion", json={"completed": True})
    assert res.status_code == 200
    body = res.json()
    codes = [item["code"] for item in body["newly_unlocked"]]
    assert "main_unlock" in codes
    # Opcionales se agregan si existen
    assert "optional_unlock" in codes


@pytest.mark.anyio
async def test_completion_ignores_optional_failures(ac, monkeypatch):
    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    async def fake_mark_completed(user_id, route_id):
        return None

    base = {
        "name": "Achievement",
        "description": "desc",
        "category": "completed_routes",
        "threshold_value": 1,
        "current_value": 1,
        "unlocked": True,
    }

    async def fake_recalc_main(user_id: str):
        return [{**base, "code": "main_unlock"}]

    async def fake_optional_fail(user_id: str):
        raise RuntimeError("optional fail")

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "mark_completed", fake_mark_completed, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_completed_routes_achievements", fake_recalc_main, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_theme_achievements", fake_optional_fail, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_distance_achievements", fake_optional_fail, raising=True)

    res = await ac.post("/routes/abc123/completion", json={"completed": True})
    assert res.status_code == 200
    body = res.json()
    codes = [item["code"] for item in body["newly_unlocked"]]
    assert codes == ["main_unlock"]
