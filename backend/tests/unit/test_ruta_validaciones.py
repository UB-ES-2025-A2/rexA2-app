import pytest
from pydantic import ValidationError
from backend.db.schemas.route import Point, RouteCreate, RoutePublic
from datetime import datetime, timezone

# Helper: crea uun Point válido (lat/long)
def _p(lat, lng):
    return Point(latitude=lat, longitude=lng)

def _valid_payload(**overrides):
    base = {
        "name": "Ruta Bonita",
        "points": [_p(1,1), _p(2,2), _p(3,3)],  #>= 3 puntos para validar
        "visibility": False,
        "description": "Una ruta de prueba",
        "category": "senderismo",
    }
    base.update(overrides)  # Aplica cambios del test
    return base

# ---------- Casos OK ----------

def test_route_create_ok():
    # Debe iinstanciar sin errores con datos válidos
    payload = _valid_payload()
    route = RouteCreate(**payload)
    assert route.name == "Ruta Bonita"
    assert route.visibility is False
    assert len(route.points) == 3       # Mínimo cumplido

def test_route_create_trim_fields():
    # Espacios alrededor no deberían romper la validación del contenido
    payload = _valid_payload(
        name="  Ruta Bonita  ",
        description="  Descripción  ",
        category="  senderismo  ",
    )
    route = RouteCreate(**payload)
    # Los validadores exigen contenido; no recortan automáticamente,
    # pero comprobamos que aceptar espacios alrededor no rompe:
    assert route.name.strip() == "Ruta Bonita"
    assert route.description.strip() == "Descripción"
    assert route.category.strip() == "senderismo"

def test_route_public_alias_dump():
    # RoutePublic debe mapear "_id" -> "id" al hacer dump by_alias
    data = _valid_payload()
    rp = RoutePublic(
        **data,
        owner_id="user123",
        created_at = datetime(2024, 1, 1, tzinfo=timezone.utc),
        **{"_id": "abc123"}  # alias
    )
    dumped = rp.model_dump(by_alias=True)
    assert dumped["id"] == "abc123"
    assert "_id" not in dumped

# ---------- Validaciones que deben fallar ----------

# Helper: verifica que el mensaje de validación incluya cierto texto
def _assert_err_contains(err: ValidationError, text: str):
    joined = " | ".join([e.get("msg", "") for e in err.errors()])
    assert text in joined, f"'{text}' no encontrado en: {joined}"

def test_min_points_validation():
    # < 3 puntos --> error de validación con mensaje específico
    payload = _valid_payload(points=[_p(1,1), _p(2,2)])  # solo 2 puntos
    with pytest.raises(ValidationError) as exc:
        RouteCreate(**payload)
    _assert_err_contains(exc.value, "Mínimo se han de seleccionar 3 puntos de interés")

def test_name_required():
    # Nombre vacío (solo espacios) --> debe fallar
    payload = _valid_payload(name="   ")
    with pytest.raises(ValidationError) as exc:
        RouteCreate(**payload)
    _assert_err_contains(exc.value, "Falta añadir nombre a la ruta")

def test_name_length_limit():
    # Nombre > 30 chars --> debe fallar
    payload = _valid_payload(name="x"*31)  # 31 caracteres
    with pytest.raises(ValidationError) as exc:
        RouteCreate(**payload)
    _assert_err_contains(exc.value, "El nombre de la ruta debe tener menos de 30 caracteres")

def test_description_required():
    # Descripción vacía: debe fallar
    payload = _valid_payload(description="   ")
    with pytest.raises(ValidationError) as exc:
        RouteCreate(**payload)
    _assert_err_contains(exc.value, "Falta añadir una descripción a la ruta")

def test_category_required():
    # Categoría vacía --> debe fallar
    payload = _valid_payload(category="   ")
    with pytest.raises(ValidationError) as exc:
        RouteCreate(**payload)
    _assert_err_contains(exc.value, "No se ha seleccionado ninguna categoría")
