import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from backend.routers.favorite import router as favorites_router
from backend.routers import favorite as favorite_mod


@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(favorites_router)

    # Override de seguridad: simulamos usuario autenticado fijo
    async def fake_current_user(_request=None):
        return {"_id": "user123", "email": "u@e.com", "is_active": True}

    app.dependency_overrides[favorite_mod.get_current_user] = fake_current_user
    return app


@pytest.fixture
async def ac(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ========== POST /favorites/{route_id} ==========

@pytest.mark.anyio
async def test_add_favorite_ok_ruta_publica(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import favorite as favorite_crud

    # Simulamos ruta pública existente
    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "otro", "visibility": True}

    called = {}

    async def fake_add_favorite(user_id, route_id):
        called["args"] = (user_id, route_id)

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(favorite_crud, "add_favorite", fake_add_favorite, raising=True)

    valid_id = "65e1234567890abcdef12345"  # 24 hex chars => ObjectId válido

    res = await ac.post(f"/favorites/{valid_id}")
    assert res.status_code == 204
    # Se debe haber llamado al CRUD con el usuario autenticado y el route_id correcto
    assert called["args"] == ("user123", valid_id)


@pytest.mark.anyio
async def test_add_favorite_400_route_id_invalido(ac):
    # No hace falta monkeypatch, la validación corta antes
    res = await ac.post("/favorites/not-an-objectid")
    assert res.status_code == 400
    assert res.json()["detail"] == "route_id inválido"


@pytest.mark.anyio
async def test_add_favorite_404_ruta_no_encontrada(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id):
        return None  # No hay ruta

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    valid_id = "65e1234567890abcdef12345"

    res = await ac.post(f"/favorites/{valid_id}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Ruta no encontrada"


@pytest.mark.anyio
async def test_add_favorite_403_ruta_privada_de_otro(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id):
        # Ruta privada cuyo owner es otro usuario
        return {"_id": route_id, "owner_id": "otro-user", "visibility": False}

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    valid_id = "65e1234567890abcdef12345"

    res = await ac.post(f"/favorites/{valid_id}")
    assert res.status_code == 403
    assert res.json()["detail"] == "No autorizado"


@pytest.mark.anyio
async def test_add_favorite_ok_ruta_privada_propia(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import favorite as favorite_crud

    async def fake_get_route_by_id(route_id):
        # Ruta privada pero con owner == usuario logueado
        return {"_id": route_id, "owner_id": "user123", "visibility": False}

    called = {}

    async def fake_add_favorite(user_id, route_id):
        called["args"] = (user_id, route_id)

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(favorite_crud, "add_favorite", fake_add_favorite, raising=True)

    valid_id = "65e1234567890abcdef12345"

    res = await ac.post(f"/favorites/{valid_id}")
    assert res.status_code == 204
    assert called["args"] == ("user123", valid_id)


# ========== DELETE /favorites/{route_id} ==========

@pytest.mark.anyio
async def test_remove_favorite_ok(ac, monkeypatch):
    from backend.db.models import favorite as favorite_crud

    called = {}

    async def fake_remove_favorite(user_id, route_id):
        called["args"] = (user_id, route_id)

    monkeypatch.setattr(favorite_crud, "remove_favorite", fake_remove_favorite, raising=True)

    valid_id = "65e1234567890abcdef12345"
    res = await ac.delete(f"/favorites/{valid_id}")
    assert res.status_code == 204
    assert called["args"] == ("user123", valid_id)


@pytest.mark.anyio
async def test_remove_favorite_400_route_id_invalido(ac):
    res = await ac.delete("/favorites/invalid-id")
    assert res.status_code == 400
    assert res.json()["detail"] == "route_id inválido"


# ========== GET /favorites/me ==========

@pytest.mark.anyio
async def test_list_my_favorites_ok(ac, monkeypatch):
    from backend.db.models import favorite as favorite_crud

    async def fake_list_favorites(user_id):
        assert user_id == "user123"
        return ["r1", "r2"]

    monkeypatch.setattr(favorite_crud, "list_favorites", fake_list_favorites, raising=True)

    res = await ac.get("/favorites/me")
    assert res.status_code == 200
    assert res.json() == {"route_ids": ["r1", "r2"]}
