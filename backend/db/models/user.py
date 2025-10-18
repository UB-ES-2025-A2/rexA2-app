from db import client                  # Obtenemos la referencia global a la db
from core.security import get_password_hash # Para hashear constraseñas antes de guardar
from bson import ObjectId                   # Para manejar IDs nativos de MongoDB

async def create_user(email:str, password: str, username: str) -> dict:
    '''
    Crea un nuevo usuario en la collección
    '''
    # Hash de la contraseña (NUNCA guardar la contraseña sin hashear)
    hashed = get_password_hash(password)   

    doc = {
        "email": email,
        "hashed_password": hashed,
        "username": username,
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