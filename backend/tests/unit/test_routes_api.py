# tests/unit/test_routes_api.py

import pytest
from datetime import datetime, timezone
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from backend.routers.routes import router as routes_router
from backend.routers import routes as routes_mod  # para referenciar la dependencia exacta

pytestmark = pytest.mark.filterwarnings(
    "ignore:ast.NameConstant is deprecated and will be removed in Python 3.14:DeprecationWarning"
)

@pytest.fixture
def test_app():
    # Creamos una app mínima exclusiva para los tests,
    app = FastAPI()
    app.include_router(routes_router)   # Montamos el router a probar

    # OVERRIDE de la dependencia EXACTA que usan las rutas
    # Simulamos un usuario autenticado para todas las rutas que lo requieran.
    # Esto evita depender de la capa de auth real.
    async def fake_current_user(_request=None):
        return {"_id": "user123", "email": "u@e.com", "is_active": True}

    # Se sobreescribe la dependencia usada por las rutas
    app.dependency_overrides[routes_mod.get_current_user] = fake_current_user
    return app


@pytest.fixture
async def ac(test_app):
    # Cliente HTTP asincrono contra la app ASGI en memoria.
    transport = ASGITransport(app=test_app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ========== /routes/check-name ==========

@pytest.mark.anyio
async def test_check_name_exists_true(ac, monkeypatch):
    from backend.db.models import route as route_crud

    # Simulamos que la ruta SÍ existe para el usuario "user123"
    async def fake_get_route_by_name(owner_id, name):
        assert owner_id == "user123"
        assert name == "Ruta X"
        return {"_id": "abc", "name": name}

    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)

    res = await ac.get("/routes/check-name", params={"name": "Ruta X"})
    assert res.status_code == 200
    assert res.json() == {"exists": True}  # contrato: exists True

@pytest.mark.anyio
async def test_check_name_exists_false(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_name(owner_id, name):
        return None  # No hay ruta con ese nombre para ese owner

    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)

    res = await ac.get("/routes/check-name", params={"name": "Ruta Y"})
    assert res.status_code == 200
    assert res.json() == {"exists": False}  # contrato: exists False


@pytest.mark.anyio
async def test_create_route_conflict_409(ac, monkeypatch):
    from backend.db.models import route as route_crud
    
    # Si el nombre ya existe, la API debe cortar el flujo y devolver 409
    async def fake_get_route_by_name(owner_id, name):
        return {"_id": "existing", "name": name}

    # Si se intentara crear, el test debe fallar (flujo incorrecto)
    async def fake_create_route(owner_id, data):
        raise AssertionError("No debe llamarse si ya existe")

    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)
    monkeypatch.setattr(route_crud, "create_route", fake_create_route, raising=True)

    payload = {
        "name": "Duplicada",
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "visibility": False,
        "description": "d",
        "category": "c",
    }

    res = await ac.post("/routes", json=payload)
    # 409 Conflict: nombre en uso
    assert res.status_code == 409
    assert res.json()["detail"] == "Este nombre de ruta ya existe"


@pytest.mark.anyio
async def test_create_route_ok_201(ac, monkeypatch):
    from backend.db.models import route as route_crud

    # Nombre libre => se debe intentar crear
    async def fake_get_route_by_name(owner_id, name):
        return None

    # Smulamos inserción en DB: devolvemos documento "persistido"
    async def fake_create_route(owner_id, data):
        return {
            "_id": "abc123",
            "owner_id": owner_id,
            **data,
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)
    monkeypatch.setattr(route_crud, "create_route", fake_create_route, raising=True)

    payload = {
        "name": "Nueva",
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "visibility": True,
        "description": "d",
        "category": "c",
        "duration_minutes": 60,
        "rating": 4.5,
    }
    res = await ac.post("/routes", json=payload)
    
    # 201 Created: creación exitosa
    assert res.status_code == 201
    body = res.json()

    # Verificamos mapeo de campos (DB-> API)
    assert body["id"] == "abc123"
    assert body["name"] == "Nueva"
    assert body["visibility"] is True
    assert body["duration_minutes"] == 60
    assert body["rating"] == 4.5
    assert body["images"] == []


@pytest.mark.anyio
async def test_update_route_ok_with_images(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "user123",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
            "images": [],
        }

    async def fake_get_route_by_name(owner_id, name):
        # Devuelve la misma ruta => no debe considerarse duplicado
        return {"_id": "route-1", "name": name}

    called = {}

    async def fake_update_route(route_id: str, owner_id: str, data: dict):
        called["route_id"] = route_id
        called["owner_id"] = owner_id
        called["data"] = data
        return {
            "_id": route_id,
            "owner_id": owner_id,
            **data,
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)
    monkeypatch.setattr(route_crud, "update_route", fake_update_route, raising=True)

    payload = {
        "name": "Ruta editada",
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "visibility": False,
        "description": "Nueva desc",
        "category": "c",
        "images": ["https://cdn.test/img.png"],
    }
    res = await ac.put("/routes/route-1", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["images"] == ["https://cdn.test/img.png"]
    assert called["data"]["images"] == ["https://cdn.test/img.png"]


@pytest.mark.anyio
async def test_update_route_duplicate_name_returns_409(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "user123",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
            "images": [],
        }

    async def fake_get_route_by_name(owner_id, name):
        # Simula otra ruta del mismo owner con el mismo nombre
        return {"_id": "other-route", "owner_id": owner_id, "name": name}

    def fake_update_route(*args, **kwargs):
        pytest.fail("update_route no debe llamarse si hay duplicado")

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(route_crud, "get_route_by_name", fake_get_route_by_name, raising=True)
    monkeypatch.setattr(route_crud, "update_route", fake_update_route, raising=True)

    payload = {
        "name": "Duplicada",
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "visibility": True,
        "description": "d",
        "category": "c",
        "images": [],
    }
    res = await ac.put("/routes/route-1", json=payload)
    assert res.status_code == 409
    assert res.json()["detail"] == "Este nombre de ruta ya existe"


@pytest.mark.anyio
async def test_update_route_forbidden_if_not_owner(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "other",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
            "images": [],
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    payload = {
        "name": "Intento",
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "visibility": True,
        "description": "d",
        "category": "c",
        "images": [],
    }
    res = await ac.put("/routes/route-1", json=payload)
    assert res.status_code == 403


@pytest.mark.anyio
async def test_list_routes_public_only_default(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_all_routes(public_only: bool):
        assert public_only is True
        return [
            {
                "_id": "1",
                "name": "P1",
                "visibility": True,
                "owner_id": "x",
                "points": [{"latitude": 1, "longitude": 1}] * 3,
                "description": "d",
                "category": "c",
                "created_at": "2025-01-01T00:00:00Z",
            },
        ]

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)

    res = await ac.get("/routes")
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    assert body[0]["id"] == "1"


@pytest.mark.anyio
async def test_list_routes_public_only_false(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_all_routes(public_only: bool):
        assert public_only is False
        return [
            {
                "_id": "1",
                "name": "R1",
                "visibility": False,
                "owner_id": "x",
                "points": [{"latitude": 1, "longitude": 1}] * 3,
                "description": "d",
                "category": "c",
                "created_at": "2025-01-01T00:00:00Z",
            },
        ]

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)

    res = await ac.get("/routes", params={"public_only": "false"})
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    assert body[0]["id"] == "1"

@pytest.mark.anyio
async def test_my_routes_ok(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_routes_by_owner(
        owner_id: str, *, public_only=None, skip=0, limit=50
    ):
        # (opcionales) aserciones para asegurarte de lo que llega
        assert public_only is None
        assert skip == 0 and limit == 50
        return [
            {
                "_id": "1",
                "name": "Mia",
                "visibility": False,
                "owner_id": owner_id,
                "points": [{"latitude": 1, "longitude": 1}] * 3,
                "description": "d",
                "category": "c",
                "created_at": "2025-01-01T00:00:00Z",
            },
        ]

    monkeypatch.setattr(route_crud, "get_routes_by_owner", fake_get_routes_by_owner, raising=True)

    res = await ac.get("/routes/me")
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    assert body[0]["id"] == "1"
    assert body[0]["name"] == "Mia"


@pytest.mark.anyio
async def test_get_route_not_found_404(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return None  # No existe esa ruta

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/NOEXISTE")
    assert res.status_code == 404
    assert res.json()["detail"] == "Ruta no encontrada"


@pytest.mark.anyio
async def test_get_route_private_not_owner_403(ac, monkeypatch):
    from backend.db.models import route as route_crud

    # Ruta privada de otro usuario => debe prohibirse (403) aunque exista
    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": "X",
            "name": "Privada",
            "owner_id": "otro",
            "visibility": False,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/X")
    assert res.status_code == 403
    # Mensaje estándar del endpoint cuando no se es el dueño o no existe
    assert res.json()["detail"] == "No autorizado o ruta inexistente"


@pytest.mark.anyio
async def test_get_route_public_200(ac, monkeypatch):
    from backend.db.models import route as route_crud
    # Ruta publica => accesible por cualquiera
    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": "X",
            "name": "Publica",
            "owner_id": "otro",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/X")
    assert res.status_code == 200
    assert res.json()["id"] == "X"  # ID expuesto en formato público


@pytest.mark.anyio
async def test_get_route_private_owned_200(ac, monkeypatch):
    from backend.db.models import route as route_crud
    #Ruta privada cuyo owner es el usuario autenticado -> debe devolver 200.
    async def fake_get_route_by_id(route_id: str):
        # owner_id coincide con el usuario del fake_current_user del fixture
        return {
            "_id": "R1",
            "name": "Ruta privada mía",
            "owner_id": "user123",
            "visibility": False,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "Solo yo la veo",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/R1")
    assert res.status_code == 200

    body = res.json()
    # Comprobamos que se ha aplicado correctamente RoutePublic
    assert body["id"] == "R1"              # alias de _id
    assert body["name"] == "Ruta privada mía"
    assert body["owner_id"] == "user123"
    assert body["visibility"] is False
    assert len(body["points"]) == 3


@pytest.mark.anyio
async def test_get_public_route_by_name_404(ac, monkeypatch):
    from backend.db.models import route as route_crud
    # No hay ruta pública con ese nombre => 404
    async def fake_get_public_route_by_name(name: str):
        return None

    monkeypatch.setattr(route_crud, "get_public_route_by_name", fake_get_public_route_by_name, raising=True)

    res = await ac.get("/routes/by-name/Invisible")
    assert res.status_code == 404
    assert res.json()["detail"] == "Ruta no encontrada"


@pytest.mark.anyio
async def test_get_public_route_by_name_200(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_public_route_by_name(name: str):
        return {
            "_id": "X",
            "name": name,
            "owner_id": "alguien",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_public_route_by_name", fake_get_public_route_by_name, raising=True)

    res = await ac.get("/routes/by-name/MiRuta")
    assert res.status_code == 200
    assert res.json()["id"] == "X"


@pytest.mark.anyio
async def test_delete_route_403(ac, monkeypatch):
    from backend.db.models import route as route_crud

    # El CRUD devuelve False => borrado no autorizado o no existe => 403
    async def fake_delete_route(route_id: str, user_id: str):
        return False

    monkeypatch.setattr(route_crud, "delete_route", fake_delete_route, raising=True)

    res = await ac.delete("/routes/X")
    assert res.status_code == 403


@pytest.mark.anyio
async def test_delete_route_204(ac, monkeypatch):
    from backend.db.models import route as route_crud
    # Devolvemos true => borrado  realizado => 204 No content
    async def fake_delete_route(route_id: str, user_id: str):
        return True

    monkeypatch.setattr(route_crud, "delete_route", fake_delete_route, raising=True)

    res = await ac.delete("/routes/X")
    assert res.status_code == 204


@pytest.mark.anyio
async def test_add_comment_ok(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "user123",
            "visibility": True,
            "comments": [],
        }

    async def fake_add_comment(route_id: str, **kwargs):
        return {
            "id": "c1",
            "user_id": kwargs["user_id"],
            "username": kwargs["username"],
            "avatar_url": kwargs.get("avatar_url"),
            "content": kwargs["content"],
            "created_at": "2025-01-01T00:00:00Z",
            "parent_id": kwargs.get("parent_id"),
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(route_crud, "add_comment", fake_add_comment, raising=True)

    res = await ac.post("/routes/abc/comments", json={"content": "Hola"})
    assert res.status_code == 201
    assert res.json()["content"] == "Hola"


@pytest.mark.anyio
async def test_add_comment_parent_not_found(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "user123",
            "visibility": True,
            "comments": [],
        }

    async def fake_add_comment(route_id: str, **kwargs):
        return None

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(route_crud, "add_comment", fake_add_comment, raising=True)

    res = await ac.post(
        "/routes/abc/comments", json={"content": "Hola", "parent_id": "nope"}
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Comentario padre no encontrado"


@pytest.mark.anyio
async def test_create_route_invalid_duration_returns_422(ac):
    payload = {
        "name": "Ruta duración inválida",
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "visibility": True,
        "description": "d",
        "category": "c",
        "duration_minutes": -10,
    }

    res = await ac.post("/routes", json=payload)
    assert res.status_code == 422


@pytest.mark.anyio
async def test_create_route_invalid_rating_returns_422(ac):
    payload = {
        "name": "Ruta rating inválido",
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "visibility": True,
        "description": "d",
        "category": "c",
        "rating": 6.0,
    }

    res = await ac.post("/routes", json=payload)
    assert res.status_code == 422


@pytest.mark.anyio
async def test_get_route_includes_user_rating(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import rating as rating_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "name": "Publica",
            "owner_id": "otro",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    async def fake_get_user_rating(user_id: str, route_id: str):
        assert user_id == "user123"
        assert route_id == "R1"
        return 4.0

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(rating_crud, "get_user_rating", fake_get_user_rating, raising=True)

    res = await ac.get("/routes/R1")
    assert res.status_code == 200
    assert res.json()["user_rating"] == 4.0


@pytest.mark.anyio
async def test_rate_route_not_found(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return None

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.post("/routes/NOPE/rating", json={"rating": 4})
    assert res.status_code == 404
    assert res.json()["detail"] == "Ruta no encontrada"


@pytest.mark.anyio
async def test_rate_route_owner_forbidden(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "user123",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.post("/routes/R1/rating", json={"rating": 4})
    assert res.status_code == 403
    assert res.json()["detail"] == "No puedes valorar tu propia ruta"


@pytest.mark.anyio
async def test_rate_route_private_forbidden(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "otro",
            "visibility": False,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.post("/routes/R2/rating", json={"rating": 4})
    assert res.status_code == 403
    assert res.json()["detail"] == "No autorizado o ruta inexistente"


@pytest.mark.anyio
async def test_rate_route_success(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import rating as rating_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "ownerX",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    called = {}

    async def fake_set_user_rating(user_id: str, route_id: str, rating: float):
        called["user_id"] = user_id
        called["route_id"] = route_id
        called["rating"] = rating
        return {"user_rating": rating, "average": 4.2, "count": 6}

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(rating_crud, "set_user_rating", fake_set_user_rating, raising=True)

    res = await ac.post("/routes/R3/rating", json={"rating": 5})
    assert res.status_code == 200
    body = res.json()
    assert body["user_rating"] == 5
    assert body["average"] == 4.2
    assert body["count"] == 6
    assert called == {"user_id": "user123", "route_id": "R3", "rating": 5}


@pytest.mark.anyio
async def test_check_route_ownership_true(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "user123",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/route-1/ownership")
    assert res.status_code == 200
    assert res.json() == {"is_owner": True}


@pytest.mark.anyio
async def test_check_route_ownership_false(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return {
            "_id": route_id,
            "owner_id": "other",
            "visibility": True,
            "points": [{"latitude": 1, "longitude": 1}] * 3,
            "description": "d",
            "category": "c",
            "created_at": "2025-01-01T00:00:00Z",
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/route-2/ownership")
    assert res.status_code == 200
    assert res.json() == {"is_owner": False}


@pytest.mark.anyio
async def test_check_route_ownership_not_found(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        return None

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/route-404/ownership")
    assert res.status_code == 404
    assert res.json()["detail"] == "Ruta no encontrada"


@pytest.mark.anyio
async def test_delete_route_calls_crud_with_correct_ids(ac, monkeypatch):
    """
    El endpoint DELETE /routes/{route_id} debe llamar a route_crud.delete_route
    con el ID de la ruta y el ID del usuario autenticado.
"""
# ========== US-10: Filtrar rutas (backend: filtro public_only) ==========

import pytest
from datetime import datetime, timezone


@pytest.mark.anyio
async def test_list_routes_default_public_only_true_calls_crud_with_true(ac, monkeypatch):
    """
    /routes sin parámetros -> debe llamar a get_all_routes(public_only=True)
    y devolver la lista de rutas públicas.
    """
    from backend.db.models import route as route_crud

    called = {}

    async def fake_get_all_routes(public_only: bool = False):
        called["public_only"] = public_only
        return [
            {
                "_id": "1",
                "owner_id": "u1",
                "name": "Ruta pública 1",
                "points": [{"latitude": 1, "longitude": 1}] * 3,
                "visibility": True,
                "description": "d",
                "category": "c",
                "duration_minutes": 30,
                "rating": 4.0,
                "created_at": datetime.now(timezone.utc),
                "comments": [],
            }
        ]

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)

    res = await ac.get("/routes")
    assert res.status_code == 200
    assert called["public_only"] is True

    body = res.json()
    assert isinstance(body, list)
    assert len(body) == 1
    # El response_model RoutePublic mapea "_id" -> "id"
    assert body[0]["id"] == "1"
    assert body[0]["name"] == "Ruta pública 1"
    assert body[0]["visibility"] is True


@pytest.mark.anyio
async def test_list_routes_public_only_false_returns_all_routes(ac, monkeypatch):
    """
    /routes?public_only=false -> debe llamar a get_all_routes(public_only=False)
    y devolver tanto públicas como privadas.
    """
    from backend.db.models import route as route_crud

    called = {}

    async def fake_delete_route(route_id: str, user_id: str) -> bool:
        called["route_id"] = route_id
        called["user_id"] = user_id
        return True  # simulamos borrado OK

    monkeypatch.setattr(route_crud, "delete_route", fake_delete_route, raising=True)

    # En tests/conftest.py, fake_current_user devuelve _id="user123"
    res = await ac.delete("/routes/ROUTE123")
    assert res.status_code == 204

    assert called["route_id"] == "ROUTE123"
    assert called["user_id"] == "user123"
    async def fake_get_all_routes(public_only: bool = False):
        called["public_only"] = public_only
        return [
            {
                "_id": "1",
                "owner_id": "u1",
                "name": "Pública",
                "points": [{"latitude": 1, "longitude": 1}] * 3,
                "visibility": True,
                "description": "d",
                "category": "c",
                "duration_minutes": 30,
                "rating": 4.0,
                "created_at": datetime.now(timezone.utc),
                "comments": [],
            },
            {
                "_id": "2",
                "owner_id": "u1",
                "name": "Privada",
                "points": [{"latitude": 1, "longitude": 1}] * 3,
                "visibility": False,
                "description": "d",
                "category": "c",
                "duration_minutes": 45,
                "rating": 3.5,
                "created_at": datetime.now(timezone.utc),
                "comments": [],
            },
        ]

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)

    res = await ac.get("/routes?public_only=false")
    assert res.status_code == 200
    assert called["public_only"] is False

    body = res.json()
    assert {r["name"] for r in body} == {"Pública", "Privada"}

# ========== US-18: Añadir comentarios (POST /routes/{route_id}/comments) ==========

@pytest.mark.anyio
async def test_add_comment_ok_returns_201_and_calls_crud(ac, monkeypatch):
    """
    Caso feliz: se añade un comentario simple (sin parent_id).
    Debe devolver 201 y el comentario creado, y llamar a route_crud.add_comment
    con los parámetros correctos.
    """
    from backend.routers import routes as routes_mod
    from backend.db.models import route as route_crud

    # _ensure_route_access devuelve una ruta que el usuario puede ver
    async def fake_ensure_route_access(route_id, current_user):
        return {
            "_id": route_id,
            "owner_id": str(current_user["_id"]),
            "visibility": True,
            "comments": [],
        }

    monkeypatch.setattr(
        routes_mod, "_ensure_route_access", fake_ensure_route_access, raising=True
    )

    called = {}

    async def fake_add_comment(
        route_id: str,
        user_id: str,
        username: str,
        content: str,
        parent_id: str | None,
        avatar_url: str | None,
    ):
        called["route_id"] = route_id
        called["user_id"] = user_id
        called["username"] = username
        called["content"] = content
        called["parent_id"] = parent_id
        called["avatar_url"] = avatar_url
        # lo que devolvería realmente el CRUD
        return {
            "id": "c1",
            "user_id": user_id,
            "username": username,
            "content": content,
            "parent_id": parent_id,
            "avatar_url": avatar_url,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    monkeypatch.setattr(route_crud, "add_comment", fake_add_comment, raising=True)

    res = await ac.post(
        "/routes/route123/comments",
        json={"content": "Buenísima ruta"},
    )
    assert res.status_code == 201
    body = res.json()

    # Comprobamos el retorno
    assert body["id"] == "c1"
    assert body["content"] == "Buenísima ruta"

    # En tests/conftest.py el fake_current_user tiene _id="user123"
    assert called["route_id"] == "route123"
    assert called["user_id"] == "user123"
    assert called["content"] == "Buenísima ruta"
    # username vendrá de current_user: username, name o email; aquí sólo validamos que no esté vacío
    assert called["username"] is not None


@pytest.mark.anyio
async def test_add_comment_empty_content_returns_422(ac, monkeypatch):
    """
    CommentCreate no permite contenido vacío -> FastAPI responde 422.
    No hace falta que se llame a _ensure_route_access ni a add_comment.
    """
    res = await ac.post(
        "/routes/route123/comments",
        json={"content": "   "},
    )
    assert res.status_code == 422


@pytest.mark.anyio
async def test_add_comment_with_nonexistent_parent_in_route_returns_404(ac, monkeypatch):
    """
    Si parent_id no está en la lista de comentarios de la ruta,
    el endpoint debe devolver 404 'Comentario padre no encontrado'
    sin llegar a llamar a route_crud.add_comment.
    """
    from backend.routers import routes as routes_mod
    from backend.db.models import route as route_crud

    async def fake_ensure_route_access(route_id, current_user):
        # comments sin ningún id que coincida con parent_id
        return {
            "_id": route_id,
            "owner_id": str(current_user["_id"]),
            "visibility": True,
            "comments": [
                {"id": "c1", "content": "hola"},
            ],
        }

    monkeypatch.setattr(
        routes_mod, "_ensure_route_access", fake_ensure_route_access, raising=True
    )

    def fake_add_comment(*args, **kwargs):
        pytest.fail("add_comment no debería llamarse si el parent_id no existe")

    monkeypatch.setattr(route_crud, "add_comment", fake_add_comment, raising=True)

    res = await ac.post(
        "/routes/route123/comments",
        json={"content": "respuesta", "parent_id": "no-existe"},
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Comentario padre no encontrado"


@pytest.mark.anyio
async def test_add_comment_parent_missing_in_crud_returns_404(ac, monkeypatch):
    """
    Si _ensure_route_access encuentra el comentario padre pero luego
    route_crud.add_comment devuelve None (por parent_id inválido),
    el endpoint también debe responder 404.
    """
    from backend.routers import routes as routes_mod
    from backend.db.models import route as route_crud

    async def fake_ensure_route_access(route_id, current_user):
        return {
            "_id": route_id,
            "owner_id": str(current_user["_id"]),
            "visibility": True,
            "comments": [
                {"id": "parent123", "content": "original"},
            ],
        }

    monkeypatch.setattr(
        routes_mod, "_ensure_route_access", fake_ensure_route_access, raising=True
    )

    async def fake_add_comment(
        route_id: str,
        user_id: str,
        username: str,
        content: str,
        parent_id: str | None,
        avatar_url: str | None,
    ):
        assert parent_id == "parent123"
        return None  # simula fallo en el CRUD

    monkeypatch.setattr(route_crud, "add_comment", fake_add_comment, raising=True)

    res = await ac.post(
        "/routes/route123/comments",
        json={"content": "respuesta", "parent_id": "parent123"},
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Comentario padre no encontrado"


@pytest.mark.anyio
async def test_rate_route_overwrites_previous_value(ac, monkeypatch):
    """
    US25: si el usuario cambia las estrellas, se actualiza su valoración
    y la respuesta refleja el nuevo valor.
    """
    from backend.db.models import route as route_crud
    from backend.db.models import rating as rating_crud

    async def fake_get_route_by_id(route_id: str):
        assert route_id == "R_OVER"
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    async def fake_set_user_rating(user_id: str, route_id: str, rating: int):
        return {"user_rating": rating, "average": 3.5, "count": 4}

    async def fake_get_route_rating_stats(route_id: str):
        assert route_id == "R_OVER"
        return {"average": 3.5, "count": 4}

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(rating_crud, "set_user_rating", fake_set_user_rating, raising=True)
    monkeypatch.setattr(rating_crud, "get_route_rating_stats", fake_get_route_rating_stats, raising=True)

    res = await ac.post("/routes/R_OVER/rating", json={"rating": 2})
    assert res.status_code == 200
    body = res.json()
    assert body["user_rating"] == 2
    assert body["average"] == 3.5
    assert body["count"] == 4
