import pytest
from bson import ObjectId
from datetime import datetime, timezone
from backend.db.models import route as route_crud

# --- Fakes mínimos ---
# Estos dobles simulan el comportamiento de Mongo para testear la capa CRUD sin DB real
class _InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id  # imita el resultado de INSERT_ONE

class FakeCursor:
    def __init__(self, docs):
        self._docs = docs
    async def to_list(self, length=None):
        return list(self._docs)         # Emula cursor.to_list()

class FakeRoutesCol:
    def __init__(self):
        self._docs = [] # Almacenamiento en memoria 

    async def insert_one(self, doc):
        _id = ObjectId()
        stored = dict(doc)
        stored["_id"] = _id
        self._docs.append(stored)   # Persiste en la "colección" fake
        return _InsertOneResult(_id)

    async def find_one(self, filter_):
        # Búsqueda exacta por igualdad calve valor
        for d in self._docs:
            ok = all(d.get(k) == v for k, v in filter_.items())
            if ok:
                return dict(d)
        return None

    def find(self, filter_):
        # Devuelve un cursor fake filtrado por igualdad
        def match(d):
            return all(d.get(k) == v for k, v in filter_.items())
        return FakeCursor([d for d in self._docs if match(d)])

    async def delete_one(self, filter_):
        # Elimina por filtro y expone deleted_count como en PyMongo
        before = len(self._docs)
        self._docs = [
            d for d in self._docs
            if not all(d.get(k) == v for k, v in filter_.items())
        ]
        class _Del:
            deleted_count = 1 if len(self._docs) < before else 0
        return _Del()

class FakeDB:
    # DB fake con ua sola colección  "routes"
    def __init__(self):
        self.routes = FakeRoutesCol()
    def __getitem__(self, name):
        assert name == "routes" # Solo se admite esta colección
        return self.routes

@pytest.fixture
def fake_db(monkeypatch):
    # Inyecta la DB fake en backend.db.client.db para todos los tests
    import backend.db.client as db_client
    monkeypatch.setattr(db_client, "db", FakeDB(), raising=True)
    return db_client.db

def _route(owner="u1", name="Ruta", vis=True):
    # Factory de documetnos de ruta coherentes para los tests
    return {
        "owner_id": owner,
        "name": name,
        "points": [{"latitude": 1, "longitude": 1}]*3,
        "visibility": vis,
        "description": "d",
        "category": "c",
        "duration_minutes": 30,
        "rating": 4.0,
        "created_at": datetime.now(timezone.utc),
    }

@pytest.mark.anyio
async def test_create_and_get_by_id(fake_db):
    # Crea y recupera por ID --> debe encontrarse y coinidir el nombre
    r = await route_crud.create_route("u1", _route(name="A"))
    got = await route_crud.get_route_by_id(str(r["_id"]))
    assert got is not None
    assert got["name"] == "A"
    assert "duration_minutes" in got
    assert "rating" in got

@pytest.mark.anyio
async def test_get_all_routes_public_only(fake_db):
    # Inserta públicas y privada, luego compureba filtrado por 'public_only'
    await route_crud.create_route("u1", _route(name="P1", vis=True))
    await route_crud.create_route("u1", _route(name="P2", vis=True))
    await route_crud.create_route("u1", _route(name="X", vis=False))

    all_routes = await route_crud.get_all_routes(public_only=False)
    pubs = await route_crud.get_all_routes(public_only=True)

    assert {r["name"] for r in all_routes} == {"P1", "P2", "X"}
    assert {r["name"] for r in pubs} == {"P1", "P2"}

@pytest.mark.anyio
async def test_get_by_owner_and_by_name(fake_db):
    # Solo el dueño puede borrar: primer intento (otro user) falla, segundo intento owner OK
    await route_crud.create_route("owner1", _route(owner="owner1", name="R1"))
    await route_crud.create_route("owner2", _route(owner="owner2", name="R2"))

    mine = await route_crud.get_routes_by_owner("owner1")
    assert len(mine) == 1 and mine[0]["name"] == "R1"

    r1 = await route_crud.get_route_by_name("owner1", "R1")
    assert r1 is not None and r1["owner_id"] == "owner1"

@pytest.mark.anyio
async def test_delete_route(fake_db):
    r = await route_crud.create_route("u1", _route(name="Del"))
    ok_wrong_owner = await route_crud.delete_route(str(r["_id"]), "u2")
    assert ok_wrong_owner is False
    ok_right_owner = await route_crud.delete_route(str(r["_id"]), "u1")
    assert ok_right_owner is True

@pytest.mark.anyio
async def test_create_route_without_duration_and_rating_sets_none(fake_db):
    # Si el diccionario no trae duration_minutes ni rating, el CRUD debe dejar esos campos en None o no romper
    data = _route(name="SinExtra")
    data.pop("duration_minutes")
    data.pop("rating")
    r = await route_crud.create_route("u1", data)
    assert "duration_minutes" in r
    assert "rating" in r
    assert r["duration_minutes"] is None
    assert r["rating"] is None

@pytest.mark.anyio
async def test_get_route_by_id_not_found_returns_none(fake_db):
    # Si el ID no existe, la función debe devolver None
    fake_id = str(ObjectId())
    got = await route_crud.get_route_by_id(fake_id)
    assert got is None
