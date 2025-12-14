import pytest
from httpx import AsyncClient

@pytest.mark.anyio
async def test_get_route_pdf_ok(ac: AsyncClient, monkeypatch):
    #US36 – Caso OK: devuelve un PDF válido.
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        assert route_id == "ROUTE_PDF_OK"
        return {
            "_id": route_id,
            "owner_id": "other-user",
            "visibility": True,
            "name": "Ruta PDF E2E",
            "description": "Ruta para probar la generación de PDF",
            "points": [
                {"latitude": 41.0, "longitude": 2.0},
                {"latitude": 41.1, "longitude": 2.1},
            ],
            "duration_minutes": 90,
            "rating": 4.5,
            "rating_count": 3,
            "comments": [
                {"author": "alice", "text": "Muy chula"},
                {"author": "bob", "text": "Repetiré"},
            ],
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/ROUTE_PDF_OK/pdf")
    assert res.status_code == 200
    assert res.headers.get("content-type", "").startswith("application/pdf")

    content_disposition = res.headers.get("content-disposition", "")
    assert "attachment" in content_disposition.lower()
    assert "pdf" in content_disposition.lower()

    content = res.content
    assert content.startswith(b"%PDF"), "El contenido devuelto no parece un PDF"

@pytest.mark.anyio
async def test_get_route_pdf_not_found(ac: AsyncClient, monkeypatch):
    #US36 – Ruta inexistente: 404.
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        assert route_id == "NO_SUCH_ROUTE"
        return None

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/NO_SUCH_ROUTE/pdf")
    assert res.status_code == 404
    body = res.json()
    assert "not found" in body.get("detail", "").lower() or "no encontrada" in body.get("detail", "").lower()

@pytest.mark.anyio
async def test_get_route_pdf_forbidden_private_route(ac: AsyncClient, monkeypatch):
    
    #US36 – Ruta privada de otro usuario: 403.
    
    from backend.db.models import route as route_crud

    async def fake_get_route_by_id(route_id: str):
        assert route_id == "PRIVATE_PDF"
        return {
            "_id": route_id,
            "owner_id": "another-user",
            "visibility": False,
            "name": "Ruta privada",
            "points": [],
        }

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)

    res = await ac.get("/routes/PRIVATE_PDF/pdf")
    assert res.status_code == 403
    body = res.json()
    assert "forbidden" in body.get("detail", "").lower() or "no autorizado" in body.get("detail", "").lower()

@pytest.mark.anyio
async def test_get_route_pdf_internal_error_returns_clear_message(ac: AsyncClient, monkeypatch):
    
    #US36 – Error al generar el PDF: mensaje claro.
    
    from backend.db.models import route as route_crud
    import backend.routers.routes as routes_mod

    async def fake_get_route_by_id(route_id: str):
        assert route_id == "ROUTE_PDF_ERROR"
        return {
            "_id": route_id,
            "owner_id": "other-user",
            "visibility": True,
            "name": "Ruta con error PDF",
            "points": [],
        }

    def fake_build_pdf_bytes(route, **kwargs):
        raise RuntimeError("PDF generation failure")

    monkeypatch.setattr(route_crud, "get_route_by_id", fake_get_route_by_id, raising=True)
    monkeypatch.setattr(routes_mod, "_build_route_pdf", fake_build_pdf_bytes, raising=False)

    try:
        res = await ac.get("/routes/ROUTE_PDF_ERROR/pdf")
    except RuntimeError as exc:
        assert "pdf generation failure" in str(exc).lower()
        return

    assert res.status_code >= 500
    body = res.json()
    detail = body.get("detail", "")
    assert "error al generar el pdf" in detail.lower() or "inténtalo de nuevo" in detail.lower()
