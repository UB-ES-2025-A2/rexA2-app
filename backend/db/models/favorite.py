from datetime import datetime, timezone
import backend.db.client as db_client

COLL = "favorites"

async def ensure_user_favorites(user_id: str):
    """
    Garantiza que el documento del usuario exista en la colección 'favorites'.
    Si no existe, lo crea con una lista vacía de route_ids.
    """
    await db_client.db[COLL].update_one(
        {"_id": str(user_id)},
        {
            "$setOnInsert": {
                "route_ids": [],
                "created_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )

async def add_favorite(user_id: str, route_id: str) -> None:
    await ensure_user_favorites(user_id) 
    await db_client.db[COLL].update_one(
        {"_id": str(user_id)},
        {
            "$addToSet": {"route_ids": str(route_id)},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )


async def remove_favorite(user_id: str, route_id: str) -> None:
    await ensure_user_favorites(user_id)
    await db_client.db[COLL].update_one(
        {"_id": str(user_id)},
        {
            "$pull": {"route_ids": str(route_id)},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )


async def list_favorites(user_id: str) -> list[str]:
    await ensure_user_favorites(user_id)
    doc = await db_client.db[COLL].find_one({"_id": str(user_id)}, {"route_ids": 1})
    return doc.get("route_ids", []) if doc else []

async def is_favorite(user_id: str, route_id: str) -> bool:
    await ensure_user_favorites(user_id)
    doc = await db_client.db[COLL].find_one(
        {"_id": str(user_id), "route_ids": str(route_id)},
        {"_id": 1},
    )
    return doc is not None