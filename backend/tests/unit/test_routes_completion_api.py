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
    assert res.json() == {"completed": True}


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

    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    called = {}

    async def fake_mark_completed(user_id, route_id):
        called["args"] = (user_id, route_id)

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "mark_completed", fake_mark_completed, raising=True)

    res = await ac.post("/routes/65e1234567890abcdef12345/completion", json={"completed": True})
    assert res.status_code == 200
    assert res.json() == {"completed": True}
    assert called["args"] == ("user123", "65e1234567890abcdef12345")


@pytest.mark.anyio
async def test_set_completion_false(ac, monkeypatch):
    from backend.db.models import route as route_crud
    from backend.db.models import completion as completion_crud

    async def fake_get_route_by_id(route_id):
        return {"_id": route_id, "owner_id": "other", "visibility": True}

    called = {}

    async def fake_unmark_completed(user_id, route_id):
        called["args"] = (user_id, route_id)

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(completion_crud, "unmark_completed", fake_unmark_completed, raising=True)

    res = await ac.post("/routes/65e1234567890abcdef12345/completion", json={"completed": False})
    assert res.status_code == 200
    assert res.json() == {"completed": False}
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
