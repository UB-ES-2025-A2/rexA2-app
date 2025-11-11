import pytest
from pydantic import ValidationError
from backend.db.schemas.favorite import FavoriteListOut


def test_favorite_list_out_ok():
    model = FavoriteListOut(route_ids=["r1", "r2"])
    assert model.route_ids == ["r1", "r2"]


def test_favorite_list_out_requiere_lista():
    # Pasar una cadena en lugar de lista debe fallar
    with pytest.raises(ValidationError):
        FavoriteListOut(route_ids="no-es-una-lista")
