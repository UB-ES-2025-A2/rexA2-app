from db import client                  # Obtenemos la referencia global a la db
from core.security import get_password_hash # Para hashear constraseñas antes de guardar
from bson import ObjectId                   # Para manejar IDs nativos de MongoDB
from typing import Literal, Optional
from typing import Optional, Dict

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
    # Inserta en MongoDB (devuelve un InserOneResult).
    result = await client.db["users"].insert_one(doc)
    # Añadimos el id al dict para devolverlo
    doc["_id"] = result.inserted_id

    return doc

async def get_user_by_id(user_id: str) -> dict | None:
    '''
    Busca un usuario por su _id o devuelve none None si no existe
    '''
    return await client.db["users"].find_one({"_id": ObjectId(user_id)})

async def get_user_by_email(email: str) -> dict | None:
    '''
    Devuelve un usuario por email o None si no Existe
    '''
    return await client.db["users"].find_one({"email": email})


# ---- Métricas de perfil ----
async def _count_routes_created(user_id: str)-> int:
    return await client.db["routes"].count_documents({"owner_id": user_id})

async def _count_routes_completed(user_id: str) -> int:
    if "user_routes_completed" not in await client.db.list_collection_names():
        return 0
    
    return await client.db["user_routes_completed"].count_documents({"user_id": user_id})

async def _count_favorites(user_id: str) -> int:
    if "favorites" not in await client.db.list_collection_names():
        return 0
    return await client.db["favorites"].count_documents({"user_id": user_id})

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