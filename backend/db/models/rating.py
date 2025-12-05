from datetime import datetime, timezone
from bson import ObjectId
import backend.db.client as db_client

COLL = "route_ratings"


def _round_one_decimal(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 1)


async def set_user_rating(user_id: str, route_id: str, rating: float) -> dict:
    """
    Crea o actualiza la valoración de un usuario para una ruta y recalcula la media.
    """
    now = datetime.now(timezone.utc)
    route_id_str = str(route_id)
    user_id_str = str(user_id)

    await db_client.db[COLL].update_one(
        {"user_id": user_id_str, "route_id": route_id_str},
        {
            "$set": {"rating": rating, "updated_at": now},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    pipeline = [
        {"$match": {"route_id": route_id_str}},
        {"$group": {"_id": None, "average": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db_client.db[COLL].aggregate(pipeline).to_list(length=1)
    average_raw = float(agg[0]["average"]) if agg else None
    count = int(agg[0]["count"]) if agg else 0
    average = _round_one_decimal(average_raw) if count > 0 else None

    await db_client.db["routes"].update_one(
        {"_id": ObjectId(route_id_str)},
        {"$set": {"rating": average, "rating_count": count}},
    )

    return {"user_rating": rating, "average": average, "count": count}


async def get_user_rating(user_id: str, route_id: str) -> float | None:
    doc = await db_client.db[COLL].find_one(
        {"user_id": str(user_id), "route_id": str(route_id)}, {"rating": 1}
    )
    if not doc:
        return None
    rating = doc.get("rating")
    return float(rating) if rating is not None else None


async def get_route_rating_stats(route_id: str) -> dict:
    """
    Devuelve {"average": float|None, "count": int} agregando todas las valoraciones.
    """
    route_id_str = str(route_id)
    pipeline = [
        {"$match": {"route_id": route_id_str}},
        {"$group": {"_id": None, "average": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db_client.db[COLL].aggregate(pipeline).to_list(length=1)
    if not agg:
        return {"average": None, "count": 0}

    count = int(agg[0]["count"])
    average_raw = float(agg[0]["average"]) if count > 0 else None
    average = _round_one_decimal(average_raw) if count > 0 else None
    return {"average": average, "count": count}
