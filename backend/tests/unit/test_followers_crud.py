# backend/tests/unit/test_followers_crud.py

import pytest
from bson import ObjectId

from backend.db.models import follow as follow_crud


# ========== Fakes para simular la colección de Mongo ==========

class FakeCountCol:
    """
    Fake minimalista para testear count_followers:
    solo guardamos el último filtro recibido.
    """
    def __init__(self, to_return: int):
        self.to_return = to_return
        self.last_filter = None

    async def count_documents(self, filter_):
        self.last_filter = filter_
        return self.to_return


class FakeFollowersCol:
    """
    Fake para list_followers:
    - aggregate(...) devuelve dos seguidores
    - count_documents(...) devuelve 2 y guarda el filtro
    """
    def __init__(self):
        self.last_pipeline = None
        self.last_filter = None

    def aggregate(self, pipeline):
        self.last_pipeline = pipeline

        async def gen():
            yield {"id": "u1", "username": "alice", "avatar_url": "alice.png"}
            yield {"id": "u2", "username": "bob", "avatar_url": None}

        return gen()

    async def count_documents(self, filter_):
        self.last_filter = filter_
        return 2


# ========== US-16: count_followers ==========

@pytest.mark.anyio
async def test_count_followers_builds_filters_with_oid_and_string(monkeypatch):
    """
    Para un ObjectId válido, count_followers debe construir un filtro que
    contemple tanto el ObjectId como la versión string ({"$or": [...]}).
    """
    fake_col = FakeCountCol(to_return=3)

    def fake_col_fn():
        return fake_col

    monkeypatch.setattr(follow_crud, "_col", fake_col_fn, raising=True)

    user_id = str(ObjectId("65e000000000000000000001"))
    total = await follow_crud.count_followers(user_id)
    assert total == 3

    f = fake_col.last_filter
    assert isinstance(f, dict)
    assert "$or" in f
    conds = f["$or"]
    # Debe haber una condición con followee_id = user_id (string plano)
    assert any(c.get("followee_id") == user_id for c in conds)


@pytest.mark.anyio
async def test_count_followers_invalid_objectid_uses_plain_string_filter(monkeypatch):
    """
    Si el user_id no es un ObjectId válido, sólo debe usar followee_id=user_id.
    """
    fake_col = FakeCountCol(to_return=0)

    def fake_col_fn():
        return fake_col

    monkeypatch.setattr(follow_crud, "_col", fake_col_fn, raising=True)

    user_id = "not-an-objectid"
    total = await follow_crud.count_followers(user_id)
    assert total == 0
    assert fake_col.last_filter == {"followee_id": user_id}


# ========== US-16: list_followers ==========

@pytest.mark.anyio
async def test_list_followers_returns_total_and_items(monkeypatch):
    """
    list_followers debe devolver un dict con total e items,
    donde cada item tiene id, username y avatar_url.
    """
    fake_col = FakeFollowersCol()

    def fake_col_fn():
        return fake_col

    monkeypatch.setattr(follow_crud, "_col", fake_col_fn, raising=True)

    user_id = str(ObjectId("65e000000000000000000002"))
    result = await follow_crud.list_followers(user_id, skip=0, limit=20)

    assert result["total"] == 2
    assert len(result["items"]) == 2
    usernames = {item["username"] for item in result["items"]}
    assert usernames == {"alice", "bob"}

    # Comprobamos que el pipeline se ha construido
    pipeline = fake_col.last_pipeline
    assert isinstance(pipeline, list)
    assert pipeline[0].get("$match") is not None
    match = pipeline[0]["$match"]
    # El match debe ir por followee_id, que será un ObjectId
    assert "followee_id" in match
    assert isinstance(match["followee_id"], ObjectId)

    # Debe usar skip y limit pasados
    assert any(stage.get("$skip") == 0 for stage in pipeline)
    assert any(stage.get("$limit") == 20 for stage in pipeline)


@pytest.mark.anyio
async def test_list_followers_respects_skip_and_limit_in_pipeline(monkeypatch):
    """
    Si cambiamos skip y limit, deben reflejarse en el pipeline.
    """
    fake_col = FakeFollowersCol()

    def fake_col_fn():
        return fake_col

    monkeypatch.setattr(follow_crud, "_col", fake_col_fn, raising=True)

    user_id = str(ObjectId("65e000000000000000000003"))
    _ = await follow_crud.list_followers(user_id, skip=5, limit=10)

    pipeline = fake_col.last_pipeline
    assert any(stage.get("$skip") == 5 for stage in pipeline)
    assert any(stage.get("$limit") == 10 for stage in pipeline)
