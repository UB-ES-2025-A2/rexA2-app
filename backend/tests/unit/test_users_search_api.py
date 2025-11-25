import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from backend.routers.users import router as users_router


@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(users_router)
    return app


@pytest.fixture
async def ac(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ========== GET /users/search ==========

@pytest.mark.anyio
async def test_search_users_ok_returns_list(ac, monkeypatch):
    from backend.db.models import user as user_crud

    async def fake_search_users(query: str, *, limit: int = 20):
        assert query == "ana"
        assert limit == 20
        return [
            {
                "id": "1",
                "name": "Ana",
                "username": "ana",
                "email": "ana@example.com",
                "avatar_url": None,
            }
        ]

    monkeypatch.setattr(user_crud, "search_users", fake_search_users, raising=True)

    res = await ac.get("/users/search?q=ana")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "1"
    assert data[0]["username"] == "ana"
    assert data[0]["email"] == "ana@example.com"


@pytest.mark.anyio
async def test_search_users_passes_limit_param_to_crud(ac, monkeypatch):
    from backend.db.models import user as user_crud

    called = {}

    async def fake_search_users(query: str, *, limit: int = 20):
        called["query"] = query
        called["limit"] = limit
        return []

    monkeypatch.setattr(user_crud, "search_users", fake_search_users, raising=True)

    res = await ac.get("/users/search?q=ana&limit=5")
    assert res.status_code == 200
    assert called["query"] == "ana"
    assert called["limit"] == 5


@pytest.mark.anyio
async def test_search_users_missing_q_returns_422(ac):
    res = await ac.get("/users/search")
    assert res.status_code == 422


@pytest.mark.anyio
async def test_search_users_empty_query_returns_422(ac):
    # q="" viola el min_length=1 del Query
    res = await ac.get("/users/search?q=")
    assert res.status_code == 422


@pytest.mark.anyio
async def test_search_users_crud_raises_returns_500(ac, monkeypatch):
    from backend.db.models import user as user_crud

    async def fake_search_users(query: str, *, limit: int = 20):
        raise Exception("boom")

    monkeypatch.setattr(user_crud, "search_users", fake_search_users, raising=True)

    res = await ac.get("/users/search?q=ana")
    assert res.status_code == 500
    assert res.json()["detail"] == "No se han podido cargar los resultados"
