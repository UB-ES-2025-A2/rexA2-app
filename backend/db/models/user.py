from backend.db import client                  # Obtenemos la referencia global a la db
from backend.core.security import get_password_hash # Para hashear constraseñas antes de guardar
from bson import ObjectId                   # Para manejar IDs nativos de MongoDB
from bson.errors import InvalidId           # Manejo de ids mal formados 

# Alias de la colección reutilizable
try:
    USERS_COL = client.db["users"]
except Exception:
    USERS_COL = None
async def create_user(email:str, password: str, username: str) -> dict:
    '''
    Crea un nuevo usuario en la collección
    '''
    if USERS_COL is None:
        raise RuntimeError("DB no inicializada (USERS_COL es None). Revisa 'client' o parchea en tests.")

    # Hash de la contraseña (NUNCA guardar la contraseña sin hashear)
    hashed = get_password_hash(password)   

    doc = {
        "email": email,
        "hashed_password": hashed,
        "username": username,
        "is_active": True,
    }
    # Inserta en MongoDB (devuelve un InsertOneResult).
    result = await USERS_COL.insert_one(doc)
    # Añadimos el id al dict para devolverlo
    doc["_id"] = result.inserted_id

    return doc

async def get_user_by_id(user_id: str) -> dict | None:
    '''
    Busca un usuario por su _id o devuelve none None si no existe
    '''
    if USERS_COL is None:
        raise RuntimeError("DB no inicializada (USERS_COL es None). Revisa 'client' o parchea en tests.")

    try:
        oid = ObjectId(user_id)
    except:
        return None

    return await USERS_COL.find_one({"_id": oid})

async def get_user_by_email(email: str) -> dict | None:
    '''
    Devuelve un usuario por email o None si no Existe
    '''
    if USERS_COL is None:
        raise RuntimeError("DB no inicializada (USERS_COL es None). Revisa 'client' o parchea en tests.")

    return await USERS_COL.find_one({"email": email})