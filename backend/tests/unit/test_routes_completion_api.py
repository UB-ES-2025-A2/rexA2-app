import pytest

from backend.routers import routes as routes_mod


@pytest.mark.anyio
async def test_get_completion_ok(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import completion as completion_crud

    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    async def fake_is_completed(user_id, route_id):
        assert user_id == "user123"
        assert route_id == "65e1234567890abcdef12345"
        return True

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "is_completed", fake_is_completed, raising=True)

    res = await ac.get("/routes/65e1234567890abcdef12345/completion")
    assert res.status_code == 200
    assert res.json() == {"completed": True, "newly_unlocked": []}


@pytest.mark.anyio
async def test_get_completion_404(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id):
        return None

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/65e1234567890abcdef12345/completion")
    assert res.status_code == 404
    assert res.json()["detail"] == "Ruta no encontrada"


@pytest.mark.anyio
async def test_get_completion_403_private_other_user(ac, monkeypatch):
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "another", "visibility": False}

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/65e1234567890abcdef12345/completion")
    assert res.status_code == 403
    assert res.json()["detail"] == "No autorizado o ruta inexistente"


@pytest.mark.anyio
async def test_set_completion_true(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import completion as completion_crud
    from backend.db.models import achievement as achievement_crud

    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    called = {}

    async def fake_mark_completed(user_id, route_id):
        called["args"] = (user_id, route_id)

    async def fake_recalculate(user_id):
        return []

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "mark_completed", fake_mark_completed, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_completed_routes_achievements", fake_recalculate, raising=True)

    res = await ac.post("/routes/65e1234567890abcdef12345/completion", json={"completed": True})
    assert res.status_code == 200
    assert res.json() == {"completed": True, "newly_unlocked": []}
    assert called["args"] == ("user123", "65e1234567890abcdef12345")


@pytest.mark.anyio
async def test_set_completion_false(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import completion as completion_crud
    from backend.db.models import achievement as achievement_crud

    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    called = {}

    async def fake_unmark_completed(user_id, route_id):
        called["args"] = (user_id, route_id)

    async def fake_recalculate(user_id):
        return []

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "unmark_completed", fake_unmark_completed, raising=True)
    monkeypatch.setattr(achievement_crud, "recalculate_completed_routes_achievements", fake_recalculate, raising=True)

    res = await ac.post("/routes/65e1234567890abcdef12345/completion", json={"completed": False})
    assert res.status_code == 200
    assert res.json() == {"completed": False, "newly_unlocked": []}
    assert called["args"] == ("user123", "65e1234567890abcdef12345")


@pytest.mark.anyio
async def test_set_completion_persist_error(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import completion as completion_crud

    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    async def fake_mark_completed(user_id, route_id):
        raise RuntimeError("boom")

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "mark_completed", fake_mark_completed, raising=True)

    res = await ac.post("/routes/65e1234567890abcdef12345/completion", json={"completed": True})
    assert res.status_code == 500
    assert res.json()["detail"] == "No se pudo actualizar el estado de la ruta"


@pytest.mark.anyio
async def test_list_my_completed_ok(ac, monkeypatch):
    from backend.db.models import completion as completion_crud

    async def fake_list_completed(user_id):
        assert user_id == "user123"
        return ["r1", "r2"]

    monkeypatch.setattr(completion_crud, "list_completed", fake_list_completed, raising=True)

    res = await ac.get("/routes/completed/me")
    assert res.status_code == 200
    assert res.json() == {"route_ids": ["r1", "r2"]}


@pytest.mark.anyio
async def test_list_routes_includes_is_completed(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import completion as completion_crud
    from backend.db.models import user as user_crud

    async def fake_get_all_routes(public_only=True):
        return [
            {
                "_id": "1",
                "owner_id": "u1",
                    "visibility": True,
                    "name": "R1",
                    "description": "desc",
                    "category": "cat",
                    "created_at": "2024-01-01T00:00:00Z",
                    "points": [
                        {"longitude": 0, "latitude": 0},
                        {"longitude": 1, "latitude": 1},
                        {"longitude": 2, "latitude": 2},
                    ],
                },
                {
                    "_id": "2",
                    "owner_id": "u2",
                    "visibility": True,
                    "name": "R2",
                    "description": "desc",
                    "category": "cat",
                    "created_at": "2024-01-01T00:00:00Z",
                    "points": [
                        {"longitude": 0, "latitude": 0},
                        {"longitude": 1, "latitude": 1},
                        {"longitude": 2, "latitude": 2},
                    ],
                },
            ]

    async def fake_list_completed(user_id):
        assert user_id == "user123"
        return ["2"]

    async def fake_get_user_by_id(uid):
        return {"_id": uid, "username": f"user-{uid}"}

    monkeypatch.setattr(route_crud, "get_all_routes", fake_get_all_routes, raising=True)
    monkeypatch.setattr(completion_crud, "list_completed", fake_list_completed, raising=True)
    monkeypatch.setattr(user_crud, "get_user_by_id", fake_get_user_by_id, raising=True)

    res = await ac.get("/routes")
    assert res.status_code == 200
    data = res.json()
    assert data[0]["is_completed"] is False
    assert data[1]["is_completed"] is True


@pytest.mark.anyio
async def test_get_route_returns_is_completed(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import completion as completion_crud
    from backend.db.models import user as user_crud

    async def fake_get_route_by_id(route_id):
        return {
            "_id": route_id,
            "owner_id": "u1",
            "visibility": True,
            "name": "R1",
            "description": "desc",
            "category": "cat",
            "created_at": "2024-01-01T00:00:00Z",
            "points": [
                {"longitude": 0, "latitude": 0},
                {"longitude": 1, "latitude": 1},
                {"longitude": 2, "latitude": 2},
            ],
        }

    async def fake_is_completed(user_id, route_id):
        assert user_id == "user123"
        return route_id == "2"

    async def fake_get_user_by_id(uid):
        return {"_id": uid, "username": f"user-{uid}"}

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "is_completed", fake_is_completed, raising=True)
    monkeypatch.setattr(user_crud, "get_user_by_id", fake_get_user_by_id, raising=True)

    res = await ac.get("/routes/2")
    assert res.status_code == 200
    assert res.json()["is_completed"] is True
