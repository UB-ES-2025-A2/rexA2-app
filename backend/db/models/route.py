# from db.client import db
import db.client as db_client
from bson import ObjectId
from datetime import datetime

async def create_route(owner_id: str, route_data:dict) -> dict:
    '''
    Crea una nueva ruta asociada a un usuario
    '''
    route = {
        "owner_id": str(owner_id),
        "name": route_data["name"],
        "points": route_data["points"],
        "visibility": route_data.get("visibility", False),
        "category": route_data.get("category"),
        "created_at": datetime.utcnow(),
    }

    result = await db_client.db["routes"].insert_one(route)
    route["_id"] = result.inserted_id
    return route

async def get_route_by_id(route_id: str) -> dict | None:
    '''
    Devuelve una ruta por su ID o None si no existe
    '''
    return await db_client.db["routes"].find_one({"_id": ObjectId(route_id)})

async def get_all_routes(public_only: bool = False) -> list[dict]:
    """Obtiene todas las rutas (públicas o todas si admin)."""
    query = {"visibility": True} if public_only else {}
    routes = db_client.db["routes"].find(query).to_list(length=None)
    return await routes

async def get_routes_by_user(owner_id: str) -> list[dict]:
    '''
    Devuelve todas las rutas de un usuario
    '''
    cursor = db_client.db["routes"].find({"owner_id": owner_id})
    return await cursor.to_list(length=None)

async def delete_route(route_id: str, user_id: str) -> bool:
    '''
    Elimina una ruta solo si pertenece al usuario.
    '''
    result = await db_client.db["routes"].delete_one({"_id": ObjectId(route_id), "owner_id": user_id})
    return result.deleted_count == 1

