import pytest
from bson import ObjectId

from backend.db.models import user as user_crud


class FakeUsersCollection:
    #Colección fake para testear funciones de perfil en user_crud sin depender de Mongo real.

    def __init__(self):
        self._docs = []

    async def insert_one(self, doc):
        _id = ObjectId()
        stored = dict(doc)
        stored["_id"] = _id
        self._docs.append(stored)

        class _Res:
            inserted_id = _id
        return _Res()

    async def find_one(self, filter_, projection=None):
        for d in self._docs:
            ok = True
            for k, v in filter_.items():
                # Soportar {"_id": {"$ne": ObjectId(...)}} usado en is_username_taken
                if isinstance(v, dict) and "$ne" in v:
                    if d.get(k) == v["$ne"]:
                        ok = False
                        break
                else:
                    if d.get(k) != v:
                        ok = False
                        break
            if ok:
                return dict(d)
        return None

    async def update_one(self, filter_, update):
        for d in self._docs:
            if all(d.get(k) == v for k, v in filter_.items()):
                for k, v in update.get("$set", {}).items():
                    d[k] = v
                for k in update.get("$unset", {}).keys():
                    d.pop(k, None)
                break


@pytest.fixture
def fake_users_col(monkeypatch):
    col = FakeUsersCollection()
    # Hacemos que USERS_COL use nuestra colección fake
    monkeypatch.setattr(user_crud, "USERS_COL", col, raising=True)
    return col


@pytest.mark.anyio
async def test_is_username_taken_true_false_and_excluding(fake_users_col):
    # Usuario existente con username "eric"
    uid = ObjectId()
    fake_users_col._docs.append(
        {"_id": uid, "email": "eric@example.com", "username": "eric"}
    )

    # username existente -> True
    assert await user_crud.is_username_taken("eric") is True
    # username inexistente -> False
    assert await user_crud.is_username_taken("other") is False
    # Si excluimos su propio _id, debe considerarse disponible
    assert await user_crud.is_username_taken("eric", exclude_user_id=str(uid)) is False


@pytest.mark.anyio
async def test_update_user_fields_sets_and_unsets(fake_users_col):
    uid = ObjectId()
    fake_users_col._docs.append(
        {
            "_id": uid,
            "email": "u@example.com",
            "username": "olduser",
            "phone": "123",
            "preferred_units": "km",
            "avatar_url": "http://old",
        }
    )

    updated = await user_crud.update_user_fields(
        str(uid),
        username="newuser",
        phone=None,               # debe hacer unset
        preferred_units="mi",     # debe actualizarse
        avatar_url=None,          # debe hacer unset
    )

    # Devuelve el doc actualizado
    assert updated["username"] == "newuser"
    assert updated["preferred_units"] == "mi"
    # phone y avatar_url eliminados del documento
    assert "phone" not in updated
    assert "avatar_url" not in updated

    # Y en la colección subyacente también debe estar aplicado el cambio
    stored = next(d for d in fake_users_col._docs if d["_id"] == uid)
    assert stored["username"] == "newuser"
    assert stored["preferred_units"] == "mi"
    assert "phone" not in stored
    assert "avatar_url" not in stored


@pytest.mark.anyio
async def test_update_user_fields_without_changes_returns_existing(fake_users_col):
    uid = ObjectId()
    fake_users_col._docs.append(
        {
            "_id": uid,
            "email": "u@example.com",
            "username": "keep",
            "preferred_units": "km",
        }
    )

    updated = await user_crud.update_user_fields(str(uid))
    # No se ha modificado nada
    assert updated["username"] == "keep"
    assert updated["preferred_units"] == "km"


@pytest.mark.anyio
async def test_get_user_profile_dict_aggregates_counts(monkeypatch):
    # Stub de contadores para no depender de Mongo real
    seen = {}

    async def fake_created(user_id: str) -> int:
        seen["created"] = user_id
        return 10

    async def fake_completed(user_id: str) -> int:
        seen["completed"] = user_id
        return 20

    async def fake_favorites(user_id: str) -> int:
        seen["favorites"] = user_id
        return 5

    monkeypatch.setattr(user_crud, "_count_routes_created", fake_created, raising=True)
    monkeypatch.setattr(user_crud, "_count_routes_completed", fake_completed, raising=True)
    monkeypatch.setattr(user_crud, "_count_favorites", fake_favorites, raising=True)

    uid = ObjectId()
    user = {
        "_id": uid,
        "username": "me",
        "email": "me@example.com",
        "phone": "999",
        "preferred_units": "mi",
        "avatar_url": "http://avatar",
    }

    profile = await user_crud.get_user_profile_dict(user)

    # id y campos básicos
    assert profile["id"] == str(uid)
    assert profile["username"] == "me"
    assert profile["email"] == "me@example.com"
    assert profile["phone"] == "999"
    assert profile["preferred_units"] == "mi"
    assert profile["avatar_url"] == "http://avatar"

    # stats con los valores de los stubs
    assert profile["stats"] == {
        "routes_created": 10,
        "routes_completed": 20,
        "routes_favorites": 5,
    }

    # Se han llamado los contadores con el id correcto (string)
    assert seen == {
        "created": str(uid),
        "completed": str(uid),
        "favorites": str(uid),
    }


@pytest.mark.anyio
async def test_get_user_profile_dict_fallbacks_username_and_defaults(monkeypatch):
    async def zero(_user_id: str) -> int:
        return 0

    monkeypatch.setattr(user_crud, "_count_routes_created", zero, raising=True)
    monkeypatch.setattr(user_crud, "_count_routes_completed", zero, raising=True)
    monkeypatch.setattr(user_crud, "_count_favorites", zero, raising=True)

    # Usuario sin username pero con name y sin preferred_units/email explícitos
    user = {
        "_id": "uid123",
        "name": "Pepe",
    }

    profile = await user_crud.get_user_profile_dict(user)

    assert profile["id"] == "uid123"
    # Debe usar name como fallback de username
    assert profile["username"] == "Pepe"
    # Si no hay email, se devuelve cadena vacía
    assert profile["email"] == ""
    # preferred_units por defecto "km"
    assert profile["preferred_units"] == "km"
    # stats a cero
    assert profile["stats"] == {
        "routes_created": 0,
        "routes_completed": 0,
        "routes_favorites": 0,
    }


# ---------- Tests extra: wrappers de stats ----------

@pytest.mark.anyio
async def test_count_routes_created_wrapper(monkeypatch):
    called = {}

    async def fake_count(user_id: str) -> int:
        called["user_id"] = user_id
        return 7

    monkeypatch.setattr(user_crud, "_count_routes_created", fake_count, raising=True)

    result = await user_crud.count_routes_created("user123")
    assert result == 7
    assert called["user_id"] == "user123"


@pytest.mark.anyio
async def test_count_routes_completed_wrapper(monkeypatch):
    called = {}

    async def fake_count(user_id: str) -> int:
        called["user_id"] = user_id
        return 4

    monkeypatch.setattr(user_crud, "_count_routes_completed", fake_count, raising=True)

    result = await user_crud.count_routes_completed("user123")
    assert result == 4
    assert called["user_id"] == "user123"


@pytest.mark.anyio
async def test_count_favorites_wrapper(monkeypatch):
    called = {}

    async def fake_count(user_id: str) -> int:
        called["user_id"] = user_id
        return 9

    monkeypatch.setattr(user_crud, "_count_favorites", fake_count, raising=True)

    result = await user_crud.count_favorites("user123")
    assert result == 9
    assert called["user_id"] == "user123"
