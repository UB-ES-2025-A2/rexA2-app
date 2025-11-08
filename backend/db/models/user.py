from typing import Optional, Dict, Any
from bson import ObjectId
from bson.errors import InvalidId

from backend.db.client import get_db
from backend.core.security import get_password_hash

USERS_COL = None

def _users_col():
    """
    Obtiene la colección 'users'.
    Si `USERS_COL` ha sido parcheado por tests, úsalo.
    Si no, usa la DB inicializada con get_db().
    """
    if USERS_COL is not None:
        return USERS_COL
    db = get_db()
    return db["users"]

async def create_user(email: str, password: str, username: str) -> Dict[str, Any]:
    """
    Crea un nuevo usuario en la colección 'users'.
    """
    col = _users_col()
    hashed = get_password_hash(password)
    doc: Dict[str, Any] = {
        "email": email,
        "hashed_password": hashed,
        "username": username,
        "is_active": True,
    }
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Busca un usuario por su _id (string) o devuelve None si no existe/mal formado.
    """
    col = _users_col()
    try:
        oid = ObjectId(user_id)
    except (InvalidId, Exception):
        return None
    return await col.find_one({"_id": oid})

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """
    Devuelve un usuario por email o None si no existe.
    """
    col = _users_col()
    return await col.find_one({"email": email})
