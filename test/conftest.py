import os
import sys
import pytest
import httpx
import importlib
import types

# Variables de entorno mínimas
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/dummy")
os.environ.setdefault("DATABASE_NAME", "testdb")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("CORS_ORIGINS", '["http://test","http://localhost"]')

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__)) 
BACKEND_PATH = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

# Fakes de base de datos
class FakeInsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class FakeUsersCollection:
    def __init__(self):
        self._docs = {}
        self._auto = 0

    async def find_one(self, filt: dict):
        email = filt.get("email")
        if email is not None:
            for doc in self._docs.values():
                if doc.get("email") == email:
                    return dict(doc)
            return None
        _id = filt.get("_id")
        if _id is not None and str(_id) in self._docs:
            return dict(self._docs[str(_id)])
        return None

    async def insert_one(self, doc: dict):
        self._auto += 1
        _id = str(self._auto)
        to_store = dict(doc)
        to_store["_id"] = _id
        self._docs[_id] = to_store
        return FakeInsertOneResult(inserted_id=_id)

class FakeDB:
    def __init__(self):
        self._users = FakeUsersCollection()

    def __getitem__(self, name: str):
        if name == "users":
            return self._users
        raise KeyError(name)

    @property
    def users(self):
        return self._users

class FakeClient:
    """Simula el cliente con atributo .db"""
    def __init__(self, db):
        self.db = db

# Cliente HTTP de tests
@pytest.fixture
async def client(monkeypatch):
    """
    Cliente HTTP que usa:
      - core.security 'fake' para romper el ciclo de imports
      - db.client parcheado para que client.db[...] sea nuestra FakeDB
    """

    fake_sec = types.ModuleType("core.security")
    def _hash(p): return f"fakehash:{p}"
    def _verify(p, h): return h == _hash(p)
    def _create_access(sub): return f"access.{sub}"
    def _create_refresh(sub): return f"refresh.{sub}"
    def _decode(tok):
        if tok.startswith("access."):
            return {"sub": tok.split(".", 1)[1], "type": "access"}
        if tok.startswith("refresh."):
            return {"sub": tok.split(".", 1)[1], "type": "refresh"}
        return {}
    async def _get_current_user(request):  
        return {"email": "dummy@example.com", "is_active": True}

    fake_sec.get_password_hash   = _hash
    fake_sec.verify_password     = _verify
    fake_sec.create_access_token = _create_access
    fake_sec.create_refresh_token= _create_refresh
    fake_sec.decode_token        = _decode
    fake_sec.get_current_user    = _get_current_user

    sys.modules["core.security"] = fake_sec

    import db.client as db_client
    import db.models.user as user_model

    fake_db = FakeDB()
    fake_client = FakeClient(fake_db)

    monkeypatch.setattr(db_client, "db", fake_db, raising=False)
    monkeypatch.setattr(db_client, "client", fake_client, raising=False)

    monkeypatch.setattr(user_model, "client", db_client, raising=False)

    async def _noop_init_db():
        db_client.db = fake_db
        db_client.client = fake_client
    monkeypatch.setattr(db_client, "init_db", _noop_init_db, raising=False)

    if "backend.main" in sys.modules:
        importlib.reload(sys.modules["backend.main"])
    import backend.main as app_module
    app = app_module.app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, fake_db
