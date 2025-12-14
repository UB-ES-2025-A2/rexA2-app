import pytest
import time
import backend.routers.routes as routes_mod


@pytest.mark.anyio
async def test_pdf_generation_performance(monkeypatch):
    route = {
        "name": "Ruta Larga",
        "description": "Una ruta con muchos puntos y comentarios",
        "points": [{"latitude": float(i), "longitude": float(i) + 1} for i in range(200)],
        "duration_minutes": 120,
        "rating": 4.2,
        "rating_count": 55,
        "comments": [{"author": f"user{i}", "text": "Buenisima"} for i in range(50)],
    }

    monkeypatch.setattr(routes_mod, "_reverse_geocode_points", lambda points, limit=10: {})

    start = time.time()
    pdf_content = routes_mod._build_route_pdf(route)
    end = time.time()

    assert pdf_content.startswith(b"%PDF")
    elapsed = (end - start) * 1000
    assert elapsed < 500, f"PDF demasiado lento: {elapsed:.2f} ms"
