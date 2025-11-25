# backend/tests/unit/test_followers_api.py

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from backend.routers.follow import router as follow_router
from backend.routers import follow as follow_mod


@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(follow_router)

    # Usuario autenticado de prueba
    async def fake_current_user(_request=None):
        return {"_id": "me123", "email": "me@example.com", "is_active": True}

    app.dependency_overrides[follow_mod.get_current_user] = fake_current_user
    return app


@pytest.fixture
async def ac(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ========== US-16: Ver mis seguidores (GET /users/{id}/followers) ==========

@pytest.mark.anyio
async def test_get_followers_returns_total_and_items(ac, monkeypatch):
    """
    El endpoint debe devolver total + lista de seguidores con id, username y avatar_url.
    """
    from backend.db.models import follow as follow_crud

    async def fake_list_followers(user_id: str, *, skip: int = 0, limit: int = 20):
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

    monkeypatch.setattr(follow_crud, "list_followers", fake_list_followers, raising=True)

    res = await ac.get("/users/me123/followers")
    assert res.status_code == 200
    body = res.json()

    assert body["total"] == 2
    assert len(body["items"]) == 2
    assert body["items"][0]["username"] == "alice"
    assert body["items"][0]["avatar_url"] == "alice.png"


@pytest.mark.anyio
async def test_get_followers_applies_skip_and_limit(ac, monkeypatch):
    """
    Debe pasar correctamente skip y limit a follow_crud.list_followers.
    """
    from backend.db.models import follow as follow_crud

    called = {}

    async def fake_list_followers(user_id: str, *, skip: int = 0, limit: int = 20):
        called["user_id"] = user_id
        called["skip"] = skip
        called["limit"] = limit
        return {"total": 0, "items": []}

    monkeypatch.setattr(follow_crud, "list_followers", fake_list_followers, raising=True)

    res = await ac.get("/users/me123/followers?skip=5&limit=10")
    assert res.status_code == 200
    assert called["user_id"] == "me123"
    assert called["skip"] == 5
    assert called["limit"] == 10


@pytest.mark.anyio
async def test_get_followers_invalid_skip_or_limit_returns_422(ac):
    """
    Validación de query params: skip >=0, 1 <= limit <= 100.
    """
    # skip negativo
    res = await ac.get("/users/me123/followers?skip=-1")
    assert res.status_code == 422

    # limit fuera de rango
    res = await ac.get("/users/me123/followers?limit=0")
    assert res.status_code == 422
