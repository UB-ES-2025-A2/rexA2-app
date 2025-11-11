from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from ..core.config import settings

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None

db: Optional[AsyncIOMotorDatabase] = None

async def init_db() -> None:
    """
    Inicializa el cliente y la base de datos.
    Debe llamarse en el 'startup' de FastAPI.
    """
    global _client, _db, db
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
        _db = _client[settings.DATABASE_NAME]
        # Mantener alias de compatibilidad
        db = _db

def get_db() -> AsyncIOMotorDatabase:
    """
    Devuelve la base de datos ya inicializada.
    Usa primero el estado interno; si no, el alias `db` (para tests).
    """
    # Prioriza el estado interno (runtime real)
    if _db is not None:
        return _db
    # Permite que los tests inyecten una FakeDB con monkeypatch sobre `db`
    if db is not None:
        return db
    raise RuntimeError("DB no inicializada. ¿Se ejecutó init_db() en startup?")

async def close_db() -> None:
    """
    Cierra el cliente (opcional: úsalo en shutdown si quieres).
    """
    global _client, _db, db
    if _client is not None:
        _client.close()
    _client = None
    _db = None
    db = None

__all__ = ["init_db", "get_db", "close_db"]
