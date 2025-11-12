import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from backend.routers.users_profile import router as users_profile_router
from backend.routers import users_profile as users_profile_mod
from backend.db.models import user as user_crud
from pymongo.errors import DuplicateKeyError


@pytest.fixture
def profile_app():
    app = FastAPI()
    app.include_router(users_profile_router)

    # Usuario autenticado fake para todos los endpoints de perfil
    async def fake_current_user(_request=None):
        return {
            "_id": "64fa0c8dbb5d2f0f12345678",
            "email": "me@example.com",
            "username": "me",
            "is_active": True,
            "phone": "111",
            "preferred_units": "km",
            "avatar_url": "http://avatar",
        }

    app.dependency_overrides[users_profile_mod.get_current_user] = fake_current_user
    return app


@pytest.fixture
async def ac_profile(profile_app):
    transport = ASGITransport(app=profile_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ---------- GET /users/me ----------

@pytest.mark.anyio
async def test_get_me_returns_public_user(ac_profile):
    res = await ac_profile.get("/users/me")
    assert res.status_code == 200
    data = res.json()

    assert data["id"] == "64fa0c8dbb5d2f0f12345678"
    assert data["email"] == "me@example.com"
    assert data["username"] == "me"
    assert data["is_active"] is True
    # No debe exponer hash ni otros campos internos
    assert "hashed_password" not in data


# ---------- GET /users/me/profile ----------

@pytest.mark.anyio
async def test_get_my_profile_uses_crud_and_returns_profile(ac_profile, monkeypatch):
    called = {}

    async def fake_get_user_profile_dict(user):
        called["user"] = user
        return {
            "id": "uid",
            "username": "me",
            "email": "me@example.com",
            "phone": None,
            "preferred_units": "km",
            "avatar_url": None,
            "stats": {
                "routes_created": 1,
                "routes_completed": 2,
                "routes_favorites": 3,
            },
        }

    monkeypatch.setattr(user_crud, "get_user_profile_dict", fake_get_user_profile_dict, raising=True)

    res = await ac_profile.get("/users/me/profile")
    assert res.status_code == 200
    data = res.json()

    # Respuesta igual a la del CRUD
    assert data == {
        "id": "uid",
        "username": "me",
        "email": "me@example.com",
        "phone": None,
        "preferred_units": "km",
        "avatar_url": None,
        "stats": {
            "routes_created": 1,
            "routes_completed": 2,
            "routes_favorites": 3,
        },
    }

    # get_user_profile_dict debe haberse llamado con el usuario autenticado fake
    assert called["user"]["_id"] == "64fa0c8dbb5d2f0f12345678"


# ---------- GET /users/check-username ----------

@pytest.mark.anyio
async def test_check_username_available_true(ac_profile, monkeypatch):
    called = {}

    async def fake_is_username_taken(username, *, exclude_user_id=None):
        called["args"] = (username, exclude_user_id)
        return False

    monkeypatch.setattr(user_crud, "is_username_taken", fake_is_username_taken, raising=True)

    res = await ac_profile.get("/users/check-username", params={"username": "newname"})
    assert res.status_code == 200
    assert res.json() == {"available": True}

    username, exclude_id = called["args"]
    assert username == "newname"
    assert exclude_id == "64fa0c8dbb5d2f0f12345678"


@pytest.mark.anyio
async def test_check_username_available_false(ac_profile, monkeypatch):
    async def fake_is_username_taken(username, *, exclude_user_id=None):
        return True

    monkeypatch.setattr(user_crud, "is_username_taken", fake_is_username_taken, raising=True)

    res = await ac_profile.get("/users/check-username", params={"username": "taken"})
    assert res.status_code == 200
    assert res.json() == {"available": False}


@pytest.mark.anyio
async def test_check_username_too_short_422(ac_profile):
    # min_length=3 -> "ab" debe fallar validación Pydantic/FastAPI
    res = await ac_profile.get("/users/check-username", params={"username": "ab"})
    assert res.status_code == 422


@pytest.mark.anyio
async def test_check_username_missing_param_422(ac_profile):
    # username es obligatorio -> sin parámetro debe dar 422
    res = await ac_profile.get("/users/check-username")
    assert res.status_code == 422


# ---------- PATCH /users/me ----------

@pytest.mark.anyio
async def test_update_my_profile_ok(ac_profile, monkeypatch):
    seen = {}

    async def fake_is_username_taken(username, *, exclude_user_id=None):
        # username disponible
        seen["check"] = (username, exclude_user_id)
        return False

    async def fake_update_user_fields(user_id, *, username=None, phone=None,
                                      preferred_units=None, avatar_url=None):
        seen["update"] = {
            "user_id": user_id,
            "username": username,
            "phone": phone,
            "preferred_units": preferred_units,
            "avatar_url": avatar_url,
        }
        # Devolvemos doc "persistido"
        return {
            "_id": user_id,
            "username": username,
            "email": "me@example.com",
            "phone": phone,
            "preferred_units": preferred_units,
            "avatar_url": avatar_url,
        }

    async def fake_get_user_profile_dict(user):
        seen["profile_user"] = user
        # Simulamos perfil final
        return {
            "id": user["_id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user["phone"],
            "preferred_units": user["preferred_units"],
            "avatar_url": user["avatar_url"],
            "stats": {
                "routes_created": 0,
                "routes_completed": 0,
                "routes_favorites": 0,
            },
        }

    monkeypatch.setattr(user_crud, "is_username_taken", fake_is_username_taken, raising=True)
    monkeypatch.setattr(user_crud, "update_user_fields", fake_update_user_fields, raising=True)
    monkeypatch.setattr(user_crud, "get_user_profile_dict", fake_get_user_profile_dict, raising=True)

    payload = {
        "username": "newuser",
        "phone": "222",
        "preferred_units": "mi",
        "avatar_url": "http://new",
    }

    res = await ac_profile.patch("/users/me", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Perfil devuelto según fake_get_user_profile_dict
    assert data["id"] == "64fa0c8dbb5d2f0f12345678"
    assert data["username"] == "newuser"
    assert data["email"] == "me@example.com"
    assert data["phone"] == "222"
    assert data["preferred_units"] == "mi"
    assert data["avatar_url"] == "http://new"

    # Se ha comprobado disponibilidad con exclude_user_id correcto
    assert seen["check"] == ("newuser", "64fa0c8dbb5d2f0f12345678")
    # Se ha llamado a update_user_fields con los valores correctos
    assert seen["update"]["user_id"] == "64fa0c8dbb5d2f0f12345678"
    assert seen["update"]["username"] == "newuser"
    assert seen["update"]["phone"] == "222"
    assert seen["update"]["preferred_units"] == "mi"
    assert seen["update"]["avatar_url"] == "http://new"


@pytest.mark.anyio
async def test_update_my_profile_username_already_taken(ac_profile, monkeypatch):
    async def fake_is_username_taken(username, *, exclude_user_id=None):
        return True  # nombre ya usado

    async def should_not_be_called(*args, **kwargs):
        raise AssertionError("update_user_fields no debe llamarse si username está ocupado")

    monkeypatch.setattr(user_crud, "is_username_taken", fake_is_username_taken, raising=True)
    monkeypatch.setattr(user_crud, "update_user_fields", should_not_be_called, raising=True)

    payload = {"username": "taken"}

    res = await ac_profile.patch("/users/me", json=payload)
    assert res.status_code == 409
    assert res.json()["detail"] == "Nombre de usuario no disponible"


@pytest.mark.anyio
async def test_update_my_profile_duplicate_key_from_db(ac_profile, monkeypatch):
    async def fake_is_username_taken(username, *, exclude_user_id=None):
        return False

    async def fake_update_user_fields(user_id, **kwargs):
        # Simula error de índice único en la base de datos
        raise DuplicateKeyError("dup username")

    monkeypatch.setattr(user_crud, "is_username_taken", fake_is_username_taken, raising=True)
    monkeypatch.setattr(user_crud, "update_user_fields", fake_update_user_fields, raising=True)

    payload = {"username": "conflict"}

    res = await ac_profile.patch("/users/me", json=payload)
    assert res.status_code == 409
    assert res.json()["detail"] == "Nombre de usuario no disponible"


@pytest.mark.anyio
async def test_update_my_profile_invalid_preferred_units_422(ac_profile, monkeypatch):
    # preferred_units sólo admite "km" o "mi" -> "invalid" debe dar 422 antes de tocar el CRUD
    payload = {"preferred_units": "invalid"}

    res = await ac_profile.patch("/users/me", json=payload)
    assert res.status_code == 422


@pytest.mark.anyio
async def test_update_my_profile_blank_phone_becomes_none(ac_profile, monkeypatch):
    """
    Caso especial de UserUpdate.empty_to_none:
    si mandamos phone = "   " debe llegar phone=None al CRUD y en el perfil.
    """
    seen = {}

    async def fake_is_username_taken(username, *, exclude_user_id=None):
        # No importa si se llama o no, siempre devolvemos False
        seen.setdefault("checks", []).append((username, exclude_user_id))
        return False

    async def fake_update_user_fields(user_id, *, username=None, phone=None,
                                      preferred_units=None, avatar_url=None):
        seen["update"] = {
            "user_id": user_id,
            "username": username,
            "phone": phone,
            "preferred_units": preferred_units,
            "avatar_url": avatar_url,
        }
        # Doc resultante en DB
        return {
            "_id": user_id,
            "username": "me",
            "email": "me@example.com",
            "phone": phone,
            "preferred_units": "km",
            "avatar_url": None,
        }

    async def fake_get_user_profile_dict(user):
        # user es el devuelto por fake_update_user_fields
        return {
            "id": user["_id"],
            "username": user["username"],
            "email": user["email"],
            "phone": user["phone"],
            "preferred_units": user["preferred_units"],
            "avatar_url": user["avatar_url"],
            "stats": {
                "routes_created": 0,
                "routes_completed": 0,
                "routes_favorites": 0,
            },
        }

    monkeypatch.setattr(user_crud, "is_username_taken", fake_is_username_taken, raising=True)
    monkeypatch.setattr(user_crud, "update_user_fields", fake_update_user_fields, raising=True)
    monkeypatch.setattr(user_crud, "get_user_profile_dict", fake_get_user_profile_dict, raising=True)

    # phone con espacios -> el validador de UserUpdate debe convertirlo a None
    payload = {"phone": "   "}

    res = await ac_profile.patch("/users/me", json=payload)
    assert res.status_code == 200
    data = res.json()

    # En la llamada al CRUD debe haberse recibido phone=None
    assert "update" in seen
    assert seen["update"]["phone"] is None

    # Y en el perfil devuelto también se refleja como null (None en JSON)
    assert data["phone"] is None
    assert data["preferred_units"] == "km"


# ---------- GET /users/me/stats ----------

@pytest.mark.anyio
async def test_get_my_stats_aggregated(ac_profile, monkeypatch):
    seen = {}

    async def fake_count_created(user_id: str) -> int:
        seen["created"] = user_id
        return 3

    async def fake_count_completed(user_id: str) -> int:
        seen["completed"] = user_id
        return 5

    async def fake_count_favorites(user_id: str) -> int:
        seen["favorites"] = user_id
        return 7

    monkeypatch.setattr(user_crud, "count_routes_created", fake_count_created, raising=True)
    monkeypatch.setattr(user_crud, "count_routes_completed", fake_count_completed, raising=True)
    monkeypatch.setattr(user_crud, "count_favorites", fake_count_favorites, raising=True)

    res = await ac_profile.get("/users/me/stats")
    assert res.status_code == 200
    data = res.json()

    assert data == {
        "routes_created": 3,
        "routes_completed": 5,
        "routes_favorites": 7,
    }

    assert seen == {
        "created": "64fa0c8dbb5d2f0f12345678",
        "completed": "64fa0c8dbb5d2f0f12345678",
        "favorites": "64fa0c8dbb5d2f0f12345678",
    }


# ========== GET puntuales de stats ==========

@pytest.mark.anyio
async def test_get_my_routes_created_count(ac_profile, monkeypatch):
    async def fake_count_created(user_id: str) -> int:
        return 42

    monkeypatch.setattr(user_crud, "count_routes_created", fake_count_created, raising=True)

    res = await ac_profile.get("/users/me/stats/routes-created")
    assert res.status_code == 200
    assert res.json() == {"count": 42}


@pytest.mark.anyio
async def test_get_my_routes_completed_count(ac_profile, monkeypatch):
    async def fake_count_completed(user_id: str) -> int:
        return 9

    monkeypatch.setattr(user_crud, "count_routes_completed", fake_count_completed, raising=True)

    res = await ac_profile.get("/users/me/stats/routes-completed")
    assert res.status_code == 200
    assert res.json() == {"count": 9}


@pytest.mark.anyio
async def test_get_my_favorites_count(ac_profile, monkeypatch):
    async def fake_count_favorites(user_id: str) -> int:
        return 4

    monkeypatch.setattr(user_crud, "count_favorites", fake_count_favorites, raising=True)

    res = await ac_profile.get("/users/me/stats/favorites")
    assert res.status_code == 200
    assert res.json() == {"count": 4}
