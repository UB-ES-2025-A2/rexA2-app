import pytest
from fastapi import HTTPException
from backend.db.models import route as route_crud
from backend.routers.routes import _ensure_route_access


@pytest.fixture
def fake_db(monkeypatch):
    from backend.tests.unit.test_routes_crud import FakeDB
    import backend.db.client as db_client

    db = FakeDB()
    monkeypatch.setattr(db_client, "db", db, raising=True)
    return db

@pytest.mark.anyio
async def test_share_access_private_route_for_owner(fake_db):
    route = await route_crud.create_route("authUser", {
        "name": "Secret",
        "visibility": False,
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "description": "Ruta privada",
        "category": "ciudad",
    })
    result = await _ensure_route_access(str(route["_id"]), {"_id": "authUser"})
    assert result is not None and result.get("visibility") is False

@pytest.mark.anyio
async def test_share_access_private_route_forbidden(fake_db):
    route = await route_crud.create_route("ownerA", {
        "name": "NoAccess",
        "visibility": False,
        "points": [{"latitude": 1, "longitude": 1}] * 3,
        "description": "Ruta privada",
        "category": "ciudad",
    })
    with pytest.raises(HTTPException) as exc:
        await _ensure_route_access(str(route["_id"]), {"_id": "otherUser"})
    assert exc.value.status_code == 403
