from datetime import datetime, timezone
from bson import ObjectId
import backend.db.client as db_client

COLL = "route_ratings"


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
    average = float(agg[0]["average"]) if agg else None
    count = int(agg[0]["count"]) if agg else 0

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
