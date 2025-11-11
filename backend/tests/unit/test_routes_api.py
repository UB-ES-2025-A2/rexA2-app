# tests/unit/test_routes_api.py

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from backend.routers.routes import router as routes_router
from backend.routers import routes as routes_mod  # para referenciar la dependencia exacta


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
    
    # Debe devolver solo rutas del usuario autenticado (inyectado por override)
    async def fake_get_routes_by_owner(owner_id: str):
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
    assert len(body) == 1
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
