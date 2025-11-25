import pytest
from datetime import datetime, timezone

from fastapi import HTTPException

from backend.routers import routes as routes_mod


# NOTA:
# Usamos la fixture `ac` (AsyncClient) definida en backend/tests/conftest.py,
# que ya monta una app con el router de /routes y un get_current_user fake.


def _make_comment(id_: str, username: str, content: str):
    """
    Helper pequeño para crear un comentario con forma razonable para CommentThread.
    Dejamos solo campos típicos: id, username, content, created_at, avatar_url, replies.
    Si el schema tiene más campos opcionales, Pydantic los podrá asumir.
    """
    return {
        "id": id_,
        "user_id": "user-" + id_,
        "username": username,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "avatar_url": None,
        "replies": [],
    }


# ========== US-19: Ver comentarios (GET /routes/{route_id}/comments) ==========

@pytest.mark.anyio
async def test_list_route_comments_public_route_returns_comments(ac, monkeypatch):
    """
    Caso feliz: ruta pública con comentarios.
    Debe devolver 200 y la lista de comentarios tal cual.
    """
    async def fake_ensure_route_access(route_id, current_user):
        assert route_id == "route123"
        return {
            "_id": route_id,
            "owner_id": "owner1",
            "visibility": True,
            "comments": [
                _make_comment("c1", "alice", "Buenísima ruta"),
                _make_comment("c2", "bob", "Está bien"),
            ],
        }

    monkeypatch.setattr(
        routes_mod,
        "_ensure_route_access",
        fake_ensure_route_access,
        raising=True,
    )

    res = await ac.get("/routes/route123/comments")
    assert res.status_code == 200

    body = res.json()
    assert isinstance(body, list)
    assert len(body) == 2
    assert body[0]["id"] == "c1"
    assert body[0]["username"] == "alice"
    assert body[0]["content"] == "Buenísima ruta"


@pytest.mark.anyio
async def test_list_route_comments_no_comments_returns_empty_list(ac, monkeypatch):
    """
    Si la ruta no tiene comentarios, el endpoint debe devolver [].
    (El mensaje 'Esta ruta no tiene comentarios' lo muestra el frontend.)
    """
    async def fake_ensure_route_access(route_id, current_user):
        return {
            "_id": route_id,
            "owner_id": "owner1",
            "visibility": True,
            "comments": [],
        }

    monkeypatch.setattr(
        routes_mod,
        "_ensure_route_access",
        fake_ensure_route_access,
        raising=True,
    )

    res = await ac.get("/routes/route-sin-comentarios/comments")
    assert res.status_code == 200
    body = res.json()
    assert body == []


@pytest.mark.anyio
async def test_list_route_comments_private_route_not_owner_returns_403(ac, monkeypatch):
    """
    Si la ruta es privada y el usuario no es propietario, _ensure_route_access
    debería levantar 403 y el endpoint debe propagarlo tal cual.
    """
    async def fake_ensure_route_access(route_id, current_user):
        # simulamos la lógica de permisos de _ensure_route_access
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")

    monkeypatch.setattr(
        routes_mod,
        "_ensure_route_access",
        fake_ensure_route_access,
        raising=True,
    )

    res = await ac.get("/routes/privada123/comments")
    assert res.status_code == 403
    assert res.json()["detail"] == "No autorizado o ruta inexistente"


@pytest.mark.anyio
async def test_list_route_comments_route_not_found_returns_404(ac, monkeypatch):
    """
    Si la ruta no existe, _ensure_route_access debería levantar 404 'Ruta no encontrada'
    y el endpoint debe devolver 404 con ese detalle.
    """
    async def fake_ensure_route_access(route_id, current_user):
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    monkeypatch.setattr(
        routes_mod,
        "_ensure_route_access",
        fake_ensure_route_access,
        raising=True,
    )

    res = await ac.get("/routes/desconocida/comments")
    assert res.status_code == 404
    assert res.json()["detail"] == "Ruta no encontrada"
