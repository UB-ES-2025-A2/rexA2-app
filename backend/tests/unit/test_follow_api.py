# backend/tests/unit/test_follow_api.py

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from backend.routers.follow import router as follow_router
from backend.routers import follow as follow_mod


@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(follow_router)

    # usuario autenticado fijo
    async def fake_current_user(_request=None):
        return {"_id": "me123", "email": "me@example.com", "is_active": True}

    app.dependency_overrides[follow_mod.get_current_user] = fake_current_user
    return app


@pytest.fixture
async def ac(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ========== US-15: seguir / dejar de seguir ==========

@pytest.mark.anyio
async def test_follow_user_ok(ac, monkeypatch):
    from backend.db.models import follow as follow_crud

    called = {}

    async def fake_follow(follower_id: str, followee_id: str):
        called["args"] = (follower_id, followee_id)
        return {"ok": True}

    monkeypatch.setattr(follow_crud, "follow", fake_follow, raising=True)

    target_id = "64fa0c8dbb5d2f0f12345678"

    res = await ac.post(f"/users/{target_id}/follow")
    assert res.status_code == 201
    data = res.json()
    assert data["ok"] is True
    assert called["args"] == ("me123", target_id)


@pytest.mark.anyio
async def test_follow_user_cannot_follow_self_returns_400(ac):
    # fake_current_user devuelve _id "me123"
    res = await ac.post("/users/me123/follow")
    assert res.status_code == 400
    # ojo: respetamos el typo del código ("ismo")
    assert res.json()["detail"] == "No puedes seguirte a ti ismo"


@pytest.mark.anyio
async def test_follow_user_value_error_from_crud_returns_400(ac, monkeypatch):
    from backend.db.models import follow as follow_crud

    async def fake_follow(follower_id: str, followee_id: str):
        raise ValueError("Usuario no encontrado")

    monkeypatch.setattr(follow_crud, "follow", fake_follow, raising=True)

    res = await ac.post("/users/other123/follow")
    assert res.status_code == 400
    assert res.json()["detail"] == "Usuario no encontrado"


@pytest.mark.anyio
async def test_unfollow_user_ok(ac, monkeypatch):
    from backend.db.models import follow as follow_crud

    called = {}

    async def fake_unfollow(follower_id: str, followee_id: str):
        called["args"] = (follower_id, followee_id)
        return {"ok": True}

    monkeypatch.setattr(follow_crud, "unfollow", fake_unfollow, raising=True)

    target_id = "64fa0c8dbb5d2f0f12345678"
    res = await ac.delete(f"/users/{target_id}/follow")
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert called["args"] == ("me123", target_id)


@pytest.mark.anyio
async def test_get_is_following_returns_flag(ac, monkeypatch):
    from backend.db.models import follow as follow_crud

    async def fake_is_following(follower_id: str, followee_id: str) -> bool:
        assert follower_id == "me123"
        assert followee_id == "other456"
        return True

    monkeypatch.setattr(follow_crud, "is_following", fake_is_following, raising=True)

    res = await ac.get("/users/other456/is-following")
    assert res.status_code == 200
    assert res.json() == {"is_following": True}


# ========== US-17: ver mis seguidos (lista following) ==========

@pytest.mark.anyio
async def test_get_following_returns_total_and_items(ac, monkeypatch):
    from backend.db.models import follow as follow_crud

    async def fake_list_following(user_id: str, *, skip: int = 0, limit: int = 20):
        assert user_id == "me123"
        assert skip == 0
        assert limit == 20
        return {
            "total": 2,
            "items": [
                {"id": "u1", "username": "alice", "avatar_url": "alice.png"},
                {"id": "u2", "username": "bob", "avatar_url": None},
            ],
        }

    monkeypatch.setattr(follow_crud, "list_following", fake_list_following, raising=True)

    res = await ac.get("/users/me123/following")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    assert body["items"][0]["username"] == "alice"


@pytest.mark.anyio
async def test_get_following_applies_skip_and_limit(ac, monkeypatch):
    from backend.db.models import follow as follow_crud

    called = {}

    async def fake_list_following(user_id: str, *, skip: int = 0, limit: int = 20):
        called["user_id"] = user_id
        called["skip"] = skip
        called["limit"] = limit
        return {"total": 0, "items": []}

    monkeypatch.setattr(follow_crud, "list_following", fake_list_following, raising=True)

    res = await ac.get("/users/me123/following?skip=10&limit=5")
    assert res.status_code == 200
    assert called["user_id"] == "me123"
    assert called["skip"] == 10
    assert called["limit"] == 5
