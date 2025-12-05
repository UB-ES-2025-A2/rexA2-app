# from db.client import db
import math
import backend.db.client as db_client
from bson import ObjectId
from datetime import datetime, timezone
from uuid import uuid4
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
    distance_km = _calculate_distance_km(route_data["points"])
    duration_minutes = _estimate_duration_minutes(distance_km)
    difficulty = _normalize_difficulty(route_data.get("difficulty")) or _estimate_difficulty(distance_km, duration_minutes)

    route = {
        "owner_id": str(owner_id),
        "name": route_data["name"],
        "points": route_data["points"],
        "visibility": route_data.get("visibility", False),
        "description": route_data["description"],
        "category": route_data["category"],
        "created_at": datetime.now(timezone.utc),
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
        "difficulty": difficulty,
        "rating": route_data.get("rating"),
        "rating_count": route_data.get("rating_count") or 0,
        "comments": [],
    }

    result = await db_client.db["routes"].insert_one(route)
    route["_id"] = result.inserted_id
    return route

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


async def add_comment(
    route_id: str,
    *,
    user_id: str,
    username: str,
    content: str,
    parent_id: str | None = None,
    avatar_url: str | None = None,
) -> dict | None:
    """
    Inserta un comentario o respuesta en la ruta.
    Devuelve el documento de comentario insertado o None si no se pudo insertar (p.e. padre inexistente).
    """
    now = datetime.now(timezone.utc)
    comment_id = str(uuid4())

    if parent_id:
        reply_doc = {
            "id": comment_id,
            "user_id": user_id,
            "username": username,
            "content": content,
            "created_at": now,
            "parent_id": parent_id,
            "avatar_url": avatar_url,
        }
        result = await db_client.db["routes"].update_one(
            {"_id": ObjectId(route_id), "comments.id": parent_id},
            {"$push": {"comments.$.replies": reply_doc}},
        )
        if result.modified_count == 0:
            return None
        return reply_doc

    comment_doc = {
        "id": comment_id,
        "user_id": user_id,
        "username": username,
        "content": content,
        "created_at": now,
        "parent_id": None,
        "replies": [],
        "avatar_url": avatar_url,
    }
    result = await db_client.db["routes"].update_one(
        {"_id": ObjectId(route_id)},
        {"$push": {"comments": comment_doc}},
    )
    if result.modified_count == 0:
        return None
    return comment_doc

# ============ DELETE OPERATIONS ============
async def delete_route(route_id: str, user_id: str) -> bool:
    '''
    Elimina una ruta solo si pertenece al usuario.
    '''
    result = await db_client.db["routes"].delete_one({"_id": ObjectId(route_id), "owner_id": str(user_id)})
    return result.deleted_count == 1


async def update_route(route_id: str, owner_id: str, data: dict) -> dict | None:
    """
    Actualiza los campos de una ruta si pertenece al usuario.
    Devuelve el documento actualizado o None si no existe o no pertenece al usuario.
    """
    # Filtra campos permitidos
    allowed_fields = {
        "name",
        "description",
        "category",
        "visibility",
        "duration_minutes",
        "difficulty",
    }
    payload = {k: v for k, v in data.items() if v is not None and k in allowed_fields}
    if not payload:
        return await get_route_by_id(route_id)

    result = await db_client.db["routes"].update_one(
        {"_id": ObjectId(route_id), "owner_id": str(owner_id)},
        {"$set": payload},
    )
    if result.matched_count == 0:
        return None

    return await get_route_by_id(route_id)
# ================== HELPERS ==================
def _to_radians(value: float) -> float:
    return (value * math.pi) / 180.0


def _calculate_segment_km(a: dict, b: dict) -> float:
    """
    Calcula la distancia Haversine entre dos puntos en kilómetros.
    Espera diccionarios con keys latitude y longitude.
    """
    lat1, lon1 = float(a["latitude"]), float(a["longitude"])
    lat2, lon2 = float(b["latitude"]), float(b["longitude"])
    dlat = _to_radians(lat2 - lat1)
    dlon = _to_radians(lon2 - lon1)
    rlat1 = _to_radians(lat1)
    rlat2 = _to_radians(lat2)

    haversine = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))
    earth_radius_km = 6371
    return earth_radius_km * c


def _calculate_distance_km(points: list[dict]) -> float | None:
    """
    Calcula la distancia total de la ruta sumando los tramos consecutivos.
    Devuelve None si no hay suficientes puntos.
    """
    if not points or len(points) < 2:
        return None
    total = 0.0
    for idx in range(1, len(points)):
        total += _calculate_segment_km(points[idx - 1], points[idx])
    return round(total, 2)


def _estimate_duration_minutes(distance_km: float | None) -> float | None:
    """
    Estimación sencilla de duración asumiendo 4 km/h (60 min/h).
    """
    if distance_km is None:
        return None
    avg_speed_kmh = 4
    minutes = (distance_km / avg_speed_kmh) * 60
    return round(minutes, 1)


def _estimate_difficulty(distance_km: float | None, duration_minutes: float | None) -> str | None:
    """
    Asigna una dificultad básica en función de distancia/duración.
    """
    if distance_km is None and duration_minutes is None:
        return None

    distance = distance_km or 0
    duration = duration_minutes or 0

    if distance > 20 or duration > 360:
        return "hard"
    if distance > 10 or duration > 180:
        return "medium"
    return "easy"


def _normalize_difficulty(value) -> str | None:
    if not value:
        return None
    v = str(value).lower().strip()
    if v in {"easy", "media", "medium"}:
        return "medium" if v.startswith("m") else "easy"
    if v in {"hard", "dificil", "difícil", "alta"}:
        return "hard"
    if v in {"facil", "fácil"}:
        return "easy"
    return v
