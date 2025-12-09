import pytest
from backend.db.models import achievement as achievement_crud


@pytest.mark.anyio
async def test_list_completed_routes_calls_recalc_and_list(monkeypatch):
    called = {}

    async def fake_recalc(user_id: str):
        called["recalc"] = user_id
        return ["dummy"]

    async def fake_list(user_id: str, category: str):
        called["list"] = (user_id, category)
        return [{"code": "c1", "name": "Explorador inicial"}]

    monkeypatch.setattr(achievement_crud, "recalculate_completed_routes_achievements", fake_recalc, raising=True)
    monkeypatch.setattr(achievement_crud, "_list_by_category", fake_list, raising=True)

    result = await achievement_crud.list_completed_routes_achievements("u1")

    assert called["recalc"] == "u1"
    assert called["list"] == ("u1", "completed_routes")
    assert result == [{"code": "c1", "name": "Explorador inicial"}]


@pytest.mark.anyio
async def test_list_created_routes_calls_recalc_and_list(monkeypatch):
    called = {}

    async def fake_recalc(user_id: str):
        called["recalc"] = user_id
        return ["dummy"]

    async def fake_list(user_id: str, category: str):
        called["list"] = (user_id, category)
        return [{"code": "cr1", "name": "Autor Novel"}]

    monkeypatch.setattr(achievement_crud, "recalculate_created_routes_achievements", fake_recalc, raising=True)
    monkeypatch.setattr(achievement_crud, "_list_by_category", fake_list, raising=True)

    result = await achievement_crud.list_created_routes_achievements("u1")

    assert called["recalc"] == "u1"
    assert called["list"] == ("u1", "created_routes")
    assert result == [{"code": "cr1", "name": "Autor Novel"}]


@pytest.mark.anyio
async def test_list_theme_achievements_calls_recalc_and_list(monkeypatch):
    called = {}

    async def fake_recalc(user_id: str):
        called["recalc"] = user_id
        return ["dummy"]

    async def fake_list(user_id: str, category: str):
        called["list"] = (user_id, category)
        return [{"code": "theme_naturaleza_level_1", "name": "Explorador de Naturaleza"}]

    monkeypatch.setattr(achievement_crud, "recalculate_theme_achievements", fake_recalc, raising=True)
    monkeypatch.setattr(achievement_crud, "_list_by_category", fake_list, raising=True)

    result = await achievement_crud.list_theme_achievements("u1")

    assert called["recalc"] == "u1"
    assert called["list"] == ("u1", "theme")
    assert result == [{"code": "theme_naturaleza_level_1", "name": "Explorador de Naturaleza"}]


@pytest.mark.anyio
async def test_list_distance_achievements_calls_recalc_and_list(monkeypatch):
    called = {}

    async def fake_recalc(user_id: str):
        called["recalc"] = user_id
        return ["dummy"]

    async def fake_list(user_id: str, category: str):
        called["list"] = (user_id, category)
        return [{"code": "distance_10", "name": "Caminante I"}]

    monkeypatch.setattr(achievement_crud, "recalculate_distance_achievements", fake_recalc, raising=True)
    monkeypatch.setattr(achievement_crud, "_list_by_category", fake_list, raising=True)

    result = await achievement_crud.list_distance_achievements("u1")

    assert called["recalc"] == "u1"
    assert called["list"] == ("u1", "distance_travelled")
    assert result == [{"code": "distance_10", "name": "Caminante I"}]
