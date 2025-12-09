import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from backend.routers import achievements as achievements_mod


@pytest.fixture
def achievements_app():
    app = FastAPI()
    app.include_router(achievements_mod.router)

    async def fake_current_user(_request=None):
        return {"_id": "user123", "email": "u@e.com"}

    app.dependency_overrides[achievements_mod.get_current_user] = fake_current_user
    return app


@pytest.fixture
async def ac(achievements_app):
    transport = ASGITransport(app=achievements_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.anyio
async def test_distance_achievements_ok(ac, monkeypatch):
    from backend.db.models import achievement as achievement_crud

    called = {}

    async def fake_list(user_id: str):
        called["user_id"] = user_id
        return [
            {
                "code": "distance_10",
                "name": "Caminante I",
                "is_unlocked": True,
                "threshold_value": 10,
                "current_value": 12,
                "rarity": "common",
              },
            {
                "code": "distance_25",
                "name": "Caminante II",
                "is_unlocked": False,
                "threshold_value": 25,
                "current_value": 12,
                "rarity": "common",
            },
        ]

    monkeypatch.setattr(achievement_crud, "list_distance_achievements", fake_list, raising=True)

    res = await ac.get("/api/users/user123/achievements/distance")
    assert res.status_code == 200
    assert len(res.json()) == 2
    assert called["user_id"] == "user123"


@pytest.mark.anyio
async def test_distance_achievements_empty(ac, monkeypatch):
    from backend.db.models import achievement as achievement_crud

    async def fake_list(user_id: str):
        return []

    monkeypatch.setattr(achievement_crud, "list_distance_achievements", fake_list, raising=True)

    res = await ac.get("/api/users/user123/achievements/distance")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.anyio
async def test_distance_achievements_internal_error(ac, monkeypatch):
    from backend.db.models import achievement as achievement_crud

    async def fake_list(user_id: str):
        raise RuntimeError("boom")

    monkeypatch.setattr(achievement_crud, "list_distance_achievements", fake_list, raising=True)

    with pytest.raises(RuntimeError):
        await ac.get("/api/users/user123/achievements/distance")


@pytest.mark.anyio
async def test_distance_achievements_forbidden(ac, achievements_app):
    app = achievements_app

    async def other_user(_request=None):
        return {"_id": "other", "email": "o@test.com"}

    app.dependency_overrides[achievements_mod.get_current_user] = other_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/users/user123/achievements/distance")
        assert res.status_code == 403
        assert res.json()["detail"] == "No autorizado"
