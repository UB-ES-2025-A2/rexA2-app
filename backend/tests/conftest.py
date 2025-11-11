# tests/conftest.py
import os

# Mínimos para que Settings no falle durante la colección de tests
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/testdb")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("CORS_ORIGINS", "[]")  # Pydantic espera JSON para listas

# Si tu Settings usa DATABASE_NAME y no tiene default:
os.environ.setdefault("DATABASE_NAME", "rex_test")

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from backend.routers.routes import router as routes_router
from backend.routers import routes as routes_mod  # para override de dependencia

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(routes_router)

    # Override de seguridad para todas las rutas de /routes
    async def fake_current_user(_request=None):
        return {"_id": "user123", "email": "u@e.com", "is_active": True}
    app.dependency_overrides[routes_mod.get_current_user] = fake_current_user

    return app

@pytest.fixture
async def ac(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client