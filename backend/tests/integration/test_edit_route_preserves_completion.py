import pytest
from backend.db.models import route as route_crud
from backend.db.models import completion as completion_crud


@pytest.mark.anyio
async def test_edit_route_preserves_completion(monkeypatch):
    routes: dict[str, dict] = {}
    completions: set[tuple[str, str]] = set()

    async def fake_create_route(owner_id, data):
        doc = {"_id": "r1", "owner_id": owner_id, **data}
        routes["r1"] = doc
        return doc

    async def fake_update_route(route_id, owner_id, data):
        if route_id not in routes:
            return None
        routes[route_id].update(data)
        return routes[route_id]

    async def fake_mark_completed(user_id, route_id):
        completions.add((user_id, route_id))

    async def fake_is_completed(user_id, route_id):
        return (user_id, route_id) in completions

    monkeypatch.setattr(route_crud, "create_route", fake_create_route, raising=True)
    monkeypatch.setattr(route_crud, "update_route", fake_update_route, raising=True)
    monkeypatch.setattr(completion_crud, "mark_completed", fake_mark_completed, raising=True)
    monkeypatch.setattr(completion_crud, "is_completed", fake_is_completed, raising=True)

    created = await route_crud.create_route(
        "user1",
        {
            "name": "Ruta Original",
            "points": [
                {"latitude": 0, "longitude": 0},
                {"latitude": 0.1, "longitude": 0.1},
            ],
        },
    )
    route_id = str(created["_id"])

    await completion_crud.mark_completed("user1", route_id)

    await route_crud.update_route(
        route_id,
        "user1",
        {
            "description": "Nueva descripcion",
        },
    )

    completed = await completion_crud.is_completed("user1", route_id)
    assert completed is True
