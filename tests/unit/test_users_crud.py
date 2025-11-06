import pytest
import types
from bson import ObjectId
from backend.db.models import user as user_crud

# Resultado mínimo que imita a pymongo.InsertOneResult
class _InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

# colección fake en moemoria para testear CRUD de usuarios sin Mongo real
class FakeCollection:
    def __init__(self):
        self._docs = []

    async def insert_one(self, doc):
        # simula creación de _id
        _id = ObjectId()
        # guardamos copia tal cual Mongo la recibiría
        stored = dict(doc)
        stored["_id"] = _id
        self._docs.append(stored)
        return _InsertOneResult(_id)

    async def find_one(self, filter_):
        # soporta {"email": "..."} o {"_id": ObjectId(...)}
        for d in self._docs:
            ok = all(d.get(k) == v for k, v in filter_.items())
            if ok:
                return dict(d)
        return None


@pytest.fixture
def fake_col(monkeypatch):
    col = FakeCollection()
    # parcheamos la colección usada por el CRUD
    monkeypatch.setattr(user_crud, "USERS_COL", col, raising=True)
    # y el hash para hacerlo determinista
    def _fake_hash(pwd: str) -> str:
        return f"hashed::{pwd}"
    monkeypatch.setattr(user_crud, "get_password_hash", _fake_hash, raising=True)
    return col


@pytest.mark.anyio
async def test_create_user_inserts_hashed_password(fake_col):
    doc = await user_crud.create_user(
        email="u@example.com", password="secret", username="user1"
    )
    # se devuelve el doc con _id
    assert "_id" in doc
    assert doc["email"] == "u@example.com"
    assert doc["username"] == "user1"
    assert doc["hashed_password"] == "hashed::secret"
    # password en claro NO debe existir
    assert "password" not in doc

@pytest.mark.anyio
async def test_get_user_by_email_ok(fake_col):
    # pre-carga
    await user_crud.create_user("a@example.com", "x", "a")
    found = await user_crud.get_user_by_email("a@example.com")
    assert found is not None
    assert found["email"] == "a@example.com"

@pytest.mark.anyio
async def test_get_user_by_id_invalid_returns_none(fake_col):
    # id inválido (no es ObjectId)
    got = await user_crud.get_user_by_id("no-objectid")
    assert got is None

@pytest.mark.anyio
async def test_get_user_by_id_ok(fake_col):
    created = await user_crud.create_user("b@example.com", "x", "b")
    _id = str(created["_id"])
    got = await user_crud.get_user_by_id(_id)
    assert got is not None
    assert got["email"] == "b@example.com"
