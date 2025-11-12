# from db.client import db
import backend.db.client as db_client
from bson import ObjectId
from datetime import datetime, timezone
# from typing import Dict

# ============ HELPERS ======================

def _normalize(doc: dict) -> dict:
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d

# ============ CREATE OPERATIONS ============
async def create_route(owner_id: str, route_data:dict) -> dict:
    '''
    Crea una nueva ruta asociada a un usuario
    '''
    route = {
        "owner_id": str(owner_id),
        "name": route_data["name"],
        "points": route_data["points"],
        "visibility": route_data.get("visibility", False),
        "description": route_data["description"],
        "category": route_data["category"],
        "created_at": datetime.now(timezone.utc),
        "duration_minutes": route_data.get("duration_minutes"),
        "rating": route_data.get("rating"),
    }

    result = await db_client.db["routes"].insert_one(route)
    route["_id"] = result.inserted_id
    return route

# ============ GET OPERATIONS ============
async def get_route_by_id(route_id: str) -> dict | None:
    '''
    Devuelve una ruta por su ID o None si no existe
    '''
    return await db_client.db["routes"].find_one({"_id": ObjectId(route_id)})


async def get_routes_by_ids(route_ids: list[str]) -> list[dict]:
    oids = []
    for s in route_ids:
        try:
            oids.append(ObjectId(s))
        except Exception:
            continue
    if not oids:
        return []
    
    curr = db_client.db["routes"].find({"_id": {"$in": oids}})
    out = []
    async for d in curr:
        d["_id"] = str(d["_id"])
        out.append(d)

    return out

async def get_all_routes(public_only: bool = False) -> list[dict]:
    """Obtiene todas las rutas (públicas o todas si admin)."""
    query = {"visibility": True} if public_only else {}
    routes = db_client.db["routes"].find(query).to_list(length=None)
    return await routes

# ---- Aquí obtenemos la lista de rutas que crea un usuario ---
async def get_routes_by_owner(owner_id: str, *, public_only: bool | None = None,
                            skip: int = 0, limit: int = 50) -> list[dict]:
    '''
    Devuelve todas las rutas de un usuario
    '''
    q =  {"owner_id": str(owner_id)}
    if public_only is True:
        q["visibility"] = True

    cur = db_client.db["routes"].find(q).skip(int(skip)).limit(int(limit))

    return [_normalize(d) async for d in cur]

async def get_route_by_name(owner_id: str, name: str) -> dict | None:
    return await db_client.db["routes"].find_one({
        "owner_id": str(owner_id),
        "name": name
    })


async def get_public_route_by_name(name: str) -> dict | None:
    """
    Busca una ruta por su nombre sin importar el propietario.
    """
    return await db_client.db["routes"].find_one({
        "name": name,
        "visibility": True,
    })

# ============ DELETE OPERATIONS ============
async def delete_route(route_id: str, user_id: str) -> bool:
    '''
    Elimina una ruta solo si pertenece al usuario.
    '''
    result = await db_client.db["routes"].delete_one({"_id": ObjectId(route_id), "owner_id": user_id})
    return result.deleted_count == 1
