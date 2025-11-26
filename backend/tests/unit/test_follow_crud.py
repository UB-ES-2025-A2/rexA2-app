# backend/tests/unit/test_follow_crud.py

import pytest
from datetime import datetime
from bson import ObjectId

from backend.db.models import follow as follow_crud


class FakeUsersCollection:
    def __init__(self, docs):
        self._docs = list(docs)

    async def find_one(self, filter_, projection=None):
        for d in self._docs:
            ok = all(d.get(k) == v for k, v in filter_.items())
            if ok:
                # no necesitamos aplicar proyección, sólo saber si existe
                return dict(d)
        return None


class FakeDeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class FakeFollowCollection:
    def __init__(self):
        self._docs = []
        self._users_collection = None
        self.last_pipeline = None


    async def insert_one(self, doc):
        # simulamos insertOne de Mongo
        stored = dict(doc)
        self._docs.append(stored)

        class _Result:
            def __init__(self):
                self.inserted_id = None

        return _Result()

    async def delete_one(self, filter_):
        before = len(self._docs)
        self._docs = [
            d for d in self._docs
            if not all(d.get(k) == v for k, v in filter_.items())
        ]
        deleted = before - len(self._docs)
        return FakeDeleteResult(deleted)

    async def find_one(self, filter_, projection=None):
        for d in self._docs:
            if all(d.get(k) == v for k, v in filter_.items()):
                return dict(d)
        return None

    async def count_documents(self, filter_):
        count = 0
        for d in self._docs:
            if all(d.get(k) == v for k, v in filter_.items()):
                count += 1
        return count

    def aggregate(self, pipeline):
        """
        Simula aggregate() de Motor:
        - NO es async.
        - Devuelve un objeto que implementa __aiter__ async.
        """
        self.last_pipeline = pipeline

        # Extraemos parámetros importantes del pipeline
        match_filter = {}
        local_field = None
        skip = 0
        limit = None

        for stage in pipeline:
            if "$match" in stage:
                match_filter = stage["$match"]
            if "$lookup" in stage:
                local_field = stage["$lookup"]["localField"]
            if "$skip" in stage:
                skip = stage["$skip"]
            if "$limit" in stage:
                limit = stage["$limit"]

        def matches(doc):
            return all(doc.get(k) == v for k, v in match_filter.items())

        # Filtramos las relaciones follow según el match (follower_id / followee_id)
        docs = [d for d in self._docs if matches(d)]
        # Orden por created_at descendente, como en el código real
        docs.sort(key=lambda d: d.get("created_at"), reverse=True)
        # skip / limit
        docs = docs[skip: skip + limit if limit is not None else None]

        # Hacemos el "join" manual con la colección de usuarios fake
        users_docs = getattr(self._users_collection, "_docs", [])

        joined = []
        for d in docs:
            uid = d.get(local_field)
            user = next((u for u in users_docs if u.get("_id") == uid), None)
            if not user:
                continue
            joined.append(
                {
                    "id": str(user["_id"]),
                    "username": user.get("username"),
                    "avatar_url": user.get("avatar_url"),
                }
            )

        # Cursor async-compatible
        class Cursor:
            def __init__(self, docs):
                self._docs = docs

            async def __aiter__(self):
                for doc in self._docs:
                    yield doc

        return Cursor(joined)


class FakeDB:
    def __init__(self, users_col, follows_col):
        self._users = users_col
        self._follows = follows_col

    def __getitem__(self, name):
        if name == "users":
            return self._users
        if name == "follow":
            return self._follows
        raise KeyError(name)


@pytest.fixture
def fake_follow_env(monkeypatch):
    # Colecciones fake y parcheo de get_db + FOLLOWS_COL
    users_docs = [
        {"_id": ObjectId("65e000000000000000000001"), "username": "alice", "avatar_url": "alice.png"},
        {"_id": ObjectId("65e000000000000000000002"), "username": "bob", "avatar_url": "bob.png"},
        {"_id": ObjectId("65e000000000000000000003"), "username": "charlie", "avatar_url": None},
    ]
    users_col = FakeUsersCollection(users_docs)
    follows_col = FakeFollowCollection()
    follows_col._users_collection = users_col

    db = FakeDB(users_col, follows_col)

    def fake_get_db():
        return db

    monkeypatch.setattr(follow_crud, "get_db", fake_get_db, raising=True)
    monkeypatch.setattr(follow_crud, "FOLLOWS_COL", follows_col, raising=True)

    return follows_col, users_docs


# ========== US-15: seguir / dejar de seguir ==========

@pytest.mark.anyio
async def test_follow_inserts_document_when_ok(fake_follow_env):
    follows_col, users_docs = fake_follow_env
    follower_id = str(users_docs[0]["_id"])
    followee_id = str(users_docs[1]["_id"])

    result = await follow_crud.follow(follower_id, followee_id)
    assert result["ok"] is True
    assert len(follows_col._docs) == 1
    doc = follows_col._docs[0]
    assert doc["follower_id"] is not None
    assert doc["followee_id"] is not None
    assert isinstance(doc.get("created_at"), datetime)


@pytest.mark.anyio
async def test_follow_cannot_follow_self(fake_follow_env):
    _, users_docs = fake_follow_env
    user_id = str(users_docs[0]["_id"])

    with pytest.raises(ValueError):
        await follow_crud.follow(user_id, user_id)


@pytest.mark.anyio
async def test_follow_raises_if_user_not_found(fake_follow_env):
    _, users_docs = fake_follow_env
    follower_id = str(users_docs[0]["_id"])
    # followee no existe en FakeUsersCollection
    followee_id = str(ObjectId("65e000000000000000000099"))

    with pytest.raises(ValueError):
        await follow_crud.follow(follower_id, followee_id)


@pytest.mark.anyio
async def test_unfollow_removes_existing_document(fake_follow_env):
    follows_col, users_docs = fake_follow_env
    follower_id = str(users_docs[0]["_id"])
    followee_id = str(users_docs[1]["_id"])

    await follow_crud.follow(follower_id, followee_id)
    assert len(follows_col._docs) == 1

    res = await follow_crud.unfollow(follower_id, followee_id)
    assert res["ok"] is True
    assert len(follows_col._docs) == 0


@pytest.mark.anyio
async def test_is_following_true_and_false(fake_follow_env):
    _, users_docs = fake_follow_env
    follower_id = str(users_docs[0]["_id"])
    followee_id = str(users_docs[1]["_id"])

    # inicialmente no sigue
    assert await follow_crud.is_following(follower_id, followee_id) is False

    await follow_crud.follow(follower_id, followee_id)
    assert await follow_crud.is_following(follower_id, followee_id) is True


# ========== US-17: ver mis seguidos (list_following) ==========

@pytest.mark.anyio
async def test_list_following_returns_total_and_items(fake_follow_env):
    _, users_docs = fake_follow_env
    me = str(users_docs[0]["_id"])
    u2 = str(users_docs[1]["_id"])
    u3 = str(users_docs[2]["_id"])

    await follow_crud.follow(me, u2)
    await follow_crud.follow(me, u3)

    result = await follow_crud.list_following(me, skip=0, limit=10)
    assert result["total"] == 2
    assert len(result["items"]) == 2
    usernames = {item["username"] for item in result["items"]}
    assert usernames == {"bob", "charlie"}
