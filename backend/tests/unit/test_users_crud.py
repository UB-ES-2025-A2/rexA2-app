import pytest
from bson import ObjectId

from backend.db.models import user as user_crud


class FakeSearchCollection:
    """
    Colección fake específica para testear search_users:
    - implementa find(...) -> cursor con .limit() y __aiter__
    - aplica filtro con "$or" y el "$regex" en name/username/email
    """
    def __init__(self, docs):
        self._docs = list(docs)

    def find(self, filter_, projection):
        def matches(doc):
            # Filtro vacío -> todos los docs
            if not filter_:
                return True

            conds = filter_.get("$or") or []
            for cond in conds:
                for field, spec in cond.items():
                    value = str(doc.get(field, ""))
                    pattern = spec.get("$regex", "")
                    options = spec.get("$options", "")
                    if "i" in options:
                        if pattern.lower() in value.lower():
                            return True
                    else:
                        if pattern in value:
                            return True
            return False

        filtered = [d for d in self._docs if matches(d)]

        class Cursor:
            def __init__(self, docs):
                self._docs = docs
                self._limit = None

            def limit(self, n: int):
                self._limit = n
                return self

            async def __aiter__(self):
                docs = self._docs
                if self._limit is not None:
                    docs = docs[: self._limit]

                for doc in docs:
                    out = {}
                    # aplicamos proyección mínima
                    for key, include in projection.items():
                        if include and key in doc:
                            out[key] = doc[key]
                    # siempre incluimos _id
                    if "_id" in doc:
                        out["_id"] = doc["_id"]
                    yield out

        return Cursor(filtered)


@pytest.fixture
def fake_search_col(monkeypatch):
    # Tres usuarios de ejemplo
    docs = [
        {
            "_id": ObjectId(),
            "name": "Ana García",
            "username": "ana",
            "email": "ana@example.com",
            "avatar_url": "a.png",
        },
        {
            "_id": ObjectId(),
            "name": "Juan Pérez",
            "username": "juan",
            "email": "juan@example.com",
            "avatar_url": "j.png",
        },
        {
            "_id": ObjectId(),
            "name": "Otro Usuario",
            "username": "otro",
            "email": "otro@test.com",
            "avatar_url": None,
        },
    ]
    col = FakeSearchCollection(docs)
    # parcheamos sólo la colección usada por search_users
    monkeypatch.setattr(user_crud, "USERS_COL", col, raising=True)
    return col


@pytest.mark.anyio
async def test_search_users_all_returns_all(fake_search_col):
    results = await user_crud.search_users("all", limit=10)
    assert len(results) == 3
    # cada doc debe tener id y no exponer _id
    for user in results:
        assert "id" in user
        assert "_id" not in user


@pytest.mark.anyio
async def test_search_users_filters_by_name_username_or_email(fake_search_col):
    # name
    results = await user_crud.search_users("ana", limit=10)
    assert len(results) == 1
    assert results[0]["username"] == "ana"

    # username
    results = await user_crud.search_users("juan", limit=10)
    assert len(results) == 1
    assert results[0]["username"] == "juan"

    # email (dominio)
    results = await user_crud.search_users("test.com", limit=10)
    assert len(results) == 1
    assert results[0]["email"] == "otro@test.com"


@pytest.mark.anyio
async def test_search_users_empty_query_returns_empty_list(fake_search_col):
    results = await user_crud.search_users("   ", limit=10)
    assert results == []


@pytest.mark.anyio
async def test_search_users_respects_limit(fake_search_col):
    # dos usuarios tienen example.com → el limit debe cortar la lista
    results = await user_crud.search_users("example.com", limit=1)
    assert len(results) == 1
