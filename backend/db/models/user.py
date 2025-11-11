from ..client import get_db                  # Obtenemos la referencia global a la db
from ...core.security import get_password_hash # Para hashear constraseñas antes de guardar
from bson import ObjectId                   # Para manejar IDs nativos de MongoDB
from typing import Literal, Optional, Any
from typing import Optional, Dict
from pymongo.errors import DuplicateKeyError

async def create_user(
        email:str, 
        password: str, 
        username: str,
        *,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        preferred_units: str = "km",
        avatar_url: Optional[str] = None,
        ) -> dict:
    '''
    Crea un nuevo usuario en la collección
    '''
    # Hash de la contraseña (NUNCA guardar la contraseña sin hashear)
    hashed = get_password_hash(password)

    doc = {
        "email": email,
        "hashed_password": hashed,
        "username": username,
        "name": name,
        "phone": phone,
        "preferred_units": preferred_units or "km",
        "avatar_url": avatar_url,
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

async def get_user_by_email(email: str) -> dict | None:
    '''
    Devuelve un usuario por email o None si no Existe
    '''
    return await get_db().db["users"].find_one({"email": email})


# ---- Métricas de perfil ----
async def _count_routes_created(user_id: str)-> int:
    return await get_db().db["routes"].count_documents({"owner_id": user_id})

async def _count_routes_completed(user_id: str) -> int:
    if "user_routes_completed" not in await get_db().db.list_collection_names():
        return 0
    
    return await get_db().db["user_routes_completed"].count_documents({"user_id": user_id})

async def _count_favorites(user_id: str) -> int:
    if "favorites" not in await get_db().db.list_collection_names():
        return 0
    return await get_db().db["favorites"].count_documents({"user_id": user_id})

async def get_user_profile_dict(user: Dict) -> Dict:
    """
    Crea el diccionario de perfil combinando datos del usuario con métricas.
    'user' proviene de la dependencia de autenticación (get_current_user).
    """
    _id = user.get("_id")
    user_id = str(_id) if isinstance(_id, ObjectId) else _id

    created = await _count_routes_created(user_id)
    completed = await _count_routes_completed(user_id)
    favorites = await _count_favorites(user_id)

    return {
        "id": user_id,
        "username": user.get("username") or user.get("name") or "",
        "email": user.get("email", ""),
        "phone": user.get("phone"),
        "preferred_units": user.get("preferred_units") or "km",
        "avatar_url": user.get("avatar_url"),
        "stats": {
            "routes_created": created,
            "routes_completed": completed,
            "routes_favorites": favorites,
        },
    }

async def is_username_taken(username: str, *, exclude_user_id: Optional[str] = None) -> bool:
    q = {"username": username}
    if exclude_user_id:
        q["_id"] = {"$ne": ObjectId(exclude_user_id)}
    doc = await get_db().db["users"].find_one(q, {"_id": 1})
    return doc is not None


async def update_user_fields(user_id: str, *, username: Optional[str] = None,
                            phone: Optional[str] = None,
                            preferred_units: Optional[str] = None,
                            avatar_url: Optional[str] = None) -> Dict:
    
    """
    PATCH parcial del usuario. Aplica $set y $unset según corresponda y
    devuelve el documento actualizado
    """
    _id = ObjectId(user_id)
    to_set = {}
    to_unset = {}

    if username is not None:
        to_set["username"] = username

    if phone is None:
        to_unset["phone"] = ""
    else:
        to_set["phone"] = phone

    if preferred_units is not None:
        to_set["preferred_units"] = preferred_units

    if avatar_url is None:
        to_unset["avatar_url"] = ""
    elif avatar_url is not None:
        to_set["avatar_url"] = avatar_url

    update = {}
    if to_set:
        update["$set"] = to_set
    if to_unset:
        update["$unset"] = to_unset

    if not update:
        # Nada que actualizar --> devuelve el actual
        return await get_db().db["users"].find_one({"_id":_id})
    
    try:
        await get_db().db["users"].update_one({"_id": _id}, update)
    except DuplicateKeyError:
        raise

    return await get_db().db["users"].find_one({"_id": _id})

async def count_routes_created(user_id: str) -> int:
    return await _count_routes_created(user_id)

async def count_routes_completed(user_id: str) -> int:
    return await _count_routes_completed(user_id)

async def count_favorites(user_id: str) -> int:
    return await _count_favorites(user_id)