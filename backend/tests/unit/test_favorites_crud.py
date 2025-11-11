import pytest
from datetime import datetime, timezone
from backend.db.models import favorite as favorite_crud

# Fakes mínimos para simular Mongo en la colección "favorites"

class FakeFavoritesCollection:
    def __init__(self):
        # _id (user_id) -> documento
        self._docs = {}

    async def update_one(self, filter_, update, upsert=False):
        user_id = filter_.get("_id")
        doc = self._docs.get(user_id)
        created = False

        if doc is None and upsert:
            doc = {"_id": user_id}
            self._docs[user_id] = doc
            created = True

        # $setOnInsert sólo aplica al crear
        set_on_insert = update.get("$setOnInsert") or {}
        if created:
            for k, v in set_on_insert.items():
                # no pisamos si ya estuviera
                doc.setdefault(k, v)

        # $addToSet
        add_to_set = update.get("$addToSet") or {}
        for field, value in add_to_set.items():
            lst = doc.setdefault(field, [])
            if value not in lst:
                lst.append(value)

        # $pull
        pull = update.get("$pull") or {}
        for field, value in pull.items():
            lst = doc.get(field, [])
            doc[field] = [v for v in lst if v != value]

        # $set genérico
        set_ = update.get("$set") or {}
        doc.update(set_)

        class _Res:
            matched_count = 1
            upserted_id = user_id if created else None

        return _Res()

    async def find_one(self, filter_, projection=None):
        # Sólo usamos filtros sencillos en el código de favoritos
        user_id = filter_.get("_id")
        route = filter_.get("route_ids")
        doc = self._docs.get(user_id)
        if doc is None:
            return None

        if route is not None:
            if route not in doc.get("route_ids", []):
                return None

        # Respetamos proyección mínima que usa el CRUD
        if projection is None:
            return dict(doc)

        result = {}
        for k in projection.keys():
            if k == "_id" or k in doc:
                result[k] = doc.get(k)
        return result


class FakeDB:
    def __init__(self):
        self.favorites = FakeFavoritesCollection()

    def __getitem__(self, name):
        assert name == favorite_crud.COLL
        return self.favorites


@pytest.fixture
def fake_db(monkeypatch):
    import backend.db.client as db_client
    db = FakeDB()
    monkeypatch.setattr(db_client, "db", db, raising=True)
    return db


@pytest.mark.anyio
async def test_ensure_user_favorites_crea_doc_si_no_existe(fake_db):
    # No hay doc previo
    user_id = "user1"
    assert user_id not in fake_db.favorites._docs

    await favorite_crud.ensure_user_favorites(user_id)

    assert user_id in fake_db.favorites._docs
    doc = fake_db.favorites._docs[user_id]
    assert doc["_id"] == user_id
    assert doc.get("route_ids") == []
    assert isinstance(doc.get("created_at"), datetime)


@pytest.mark.anyio
async def test_add_favorite_inserta_y_no_duplica(fake_db):
    user_id = "user1"
    route_id = "routeA"

    await favorite_crud.add_favorite(user_id, route_id)
    # Primera vez: se crea doc y se añade routeA
    doc = fake_db.favorites._docs[user_id]
    assert doc["route_ids"] == ["routeA"]
    first_updated = doc.get("updated_at")
    assert isinstance(first_updated, datetime)

    # Segunda vez con misma ruta: no debe duplicar
    await favorite_crud.add_favorite(user_id, route_id)
    doc = fake_db.favorites._docs[user_id]
    assert doc["route_ids"] == ["routeA"]
    assert doc["updated_at"] >= first_updated


@pytest.mark.anyio
async def test_remove_favorite_quita_ruta_pero_mantiene_doc(fake_db):
    user_id = "userX"
    # Preparamos doc inicial manualmente
    fake_db.favorites._docs[user_id] = {
        "_id": user_id,
        "route_ids": ["r1", "r2"],
        "created_at": datetime.now(timezone.utc),
    }

    await favorite_crud.remove_favorite(user_id, "r1")
    doc = fake_db.favorites._docs[user_id]
    assert doc["route_ids"] == ["r2"]
    assert isinstance(doc.get("updated_at"), datetime)

    # Quitar una ruta que no existe no debe romper ni modificar la lista
    before = list(doc["route_ids"])
    await favorite_crud.remove_favorite(user_id, "no-existe")
    assert doc["route_ids"] == before


@pytest.mark.anyio
async def test_list_favorites_devuelve_lista_y_crea_doc(fake_db):
    user_new = "nuevo"
    # Usuario sin documento previo
    assert user_new not in fake_db.favorites._docs

    res = await favorite_crud.list_favorites(user_new)
    assert res == []  # contrato: lista vacía
    assert user_new in fake_db.favorites._docs  # ensure_user_favorites se ha invocado

    # Ahora, con rutas dentro
    fake_db.favorites._docs[user_new]["route_ids"] = ["a", "b"]
    res2 = await favorite_crud.list_favorites(user_new)
    assert res2 == ["a", "b"]


@pytest.mark.anyio
async def test_is_favorite_true_y_false(fake_db):
    user_id = "u1"
    fake_db.favorites._docs[user_id] = {
        "_id": user_id,
        "route_ids": ["r1"],
        "created_at": datetime.now(timezone.utc),
    }

    assert await favorite_crud.is_favorite(user_id, "r1") is True
    assert await favorite_crud.is_favorite(user_id, "otro") is False

    # Para usuario sin doc previo, debe crear y devolver False
    user2 = "u2"
    assert await favorite_crud.is_favorite(user2, "rX") is False
    assert user2 in fake_db.favorites._docs
