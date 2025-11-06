import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from backend.routers.users import router as users_router
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def test_app():
    # App mínima de pruebas montando sólo el router de usuarios
    app = FastAPI()
    app.include_router(users_router)
    return app


@pytest.mark.anyio
async def test_register_user_conflict_returns_409(test_app, monkeypatch):
    # monkeypatch del CRUD que usa el router
    from backend.db.models import user as user_crud

    async def fake_get_user_by_email(email: str):
        # Stub: el emaul ya está registrado --> debe devolver 409 y NO crear
        return {"_id": "X", "email": email}  # simula existencia

    # Si se llama a create_user en este escenario, es un error de flujo
    async def fake_create_user(**kwargs):
        raise AssertionError("No debe llamarse si ya existe")

    # Inyección de stubs en el unto de uso real
    monkeypatch.setattr(user_crud, "get_user_by_email", fake_get_user_by_email, raising=True)
    monkeypatch.setattr(user_crud, "create_user", fake_create_user, raising=True)
    
    # Payload de registro con email tomado
    payload = {
        "email": "taken@example.com",
        "username": "taken",
        "name": None,
        "password": "secret",
    }

    # Cliente HTTPS sobre ASGITransport (sin levantar servidor externo)
    transport = ASGITransport(app=test_app)            
    async with AsyncClient(transport=transport, base_url="http://test") as ac:  # CHANGED
        res = await ac.post("/users", json=payload)

    # Debe responder 409 con detalle específico
    assert res.status_code == 409
    assert res.json()["detail"] == "Email ya registrado"


@pytest.mark.anyio
async def test_register_user_created_201(test_app, monkeypatch):
    from backend.db.models import user as user_crud

    # Stub: email no existe --> se debe crear
    async def fake_get_user_by_email(email: str):
        return None  # no existe

    # Stub: creación existosa; devuelve doc "persisitido"
    async def fake_create_user(email: str, password: str, username: str):
        return {
            "_id": "64fa0c8dbb5d2f0f12345678",
            "email": email,
            "username": username,
            "is_active": True,
            "hashed_password": "ignore",    # No debe exponerse en la respuesta
        }

    monkeypatch.setattr(user_crud, "get_user_by_email", fake_get_user_by_email, raising=True)
    monkeypatch.setattr(user_crud, "create_user", fake_create_user, raising=True)

    payload = {
        "email": "new@example.com",
        "username": "newuser",
        "name": None,
        "password": "secret",
    }

    # Cliente HTTP en memoria
    transport = ASGITransport(app=test_app)           
    async with AsyncClient(transport=transport, base_url="http://test") as ac:  
        res = await ac.post("/users", json=payload)

    # 201 Created y mapeo de campos correcto
    assert res.status_code == 201
    data = res.json()
    assert data["id"] == "64fa0c8dbb5d2f0f12345678"
    assert data["email"] == "new@example.com"
    assert data["username"] == "newuser"
    assert data["is_active"] is True
    # comprobar que no exponemos el hash
    assert "hashed_password" not in data
