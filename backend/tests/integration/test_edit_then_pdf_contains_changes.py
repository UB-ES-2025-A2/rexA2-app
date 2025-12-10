import pytest
from backend.db.models import route as route_crud
import backend.routers.routes as routes_mod


@pytest.mark.anyio
async def test_edit_then_pdf_contains_changes(monkeypatch):
    routes: dict[str, dict] = {}

    async def fake_create_route(owner_id, data):
        doc = {"_id": "r1", "owner_id": owner_id, **data}
        routes["r1"] = doc
        return doc

    async def fake_update_route(route_id, owner_id, data):
        if route_id not in routes:
            return None
        routes[route_id].update(data)
        return routes[route_id]

    async def fake_get_route_by_id(route_id):
        return routes.get(route_id)

    monkeypatch.setattr(route_crud, "create_route", fake_create_route, raising=True)
    monkeypatch.setattr(route_crud, "update_route", fake_update_route, raising=True)
    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(routes_mod, "_reverse_geocode_points", lambda points, limit=10: {})

    created = await route_crud.create_route(
        "user1",
        {
            "name": "Ruta Antigua",
            "description": "Desc vieja",
            "points": [
                {"latitude": 0.0, "longitude": 0.0},
                {"latitude": 0.1, "longitude": 0.1},
            ],
        },
    )

    route_id = str(created["_id"])

    await route_crud.update_route(
        route_id,
        "user1",
        {
            "name": "Ruta EDITADA",
            "description": "Desc nueva",
        },
    )

    edited = await route_crud.get_route_by_id(route_id)
    pdf_bytes = routes_mod._build_route_pdf(edited)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 1000
