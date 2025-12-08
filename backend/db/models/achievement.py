from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

import backend.db.client as db_client

ACHIEVEMENTS_COLL = "achievements"
USER_ACHIEVEMENTS_COLL = "user_achievements"

DEFAULT_COMPLETED_ROUTES_ACHIEVEMENTS: list[dict[str, Any]] = [
    {
        "code": "completed_routes_1",
        "name": "Explorador inicial",
        "description": "Completa tu primera ruta.",
        "category": "completed_routes",
        "threshold_value": 1,
        "icon": "🧭",
        "rarity": "common",
    },
    {
        "code": "completed_routes_5",
        "name": "Caminante constante",
        "description": "Marca 5 rutas como realizadas.",
        "category": "completed_routes",
        "threshold_value": 5,
        "icon": "🥾",
        "rarity": "common",
    },
    {
        "code": "completed_routes_10",
        "name": "Explorador experto",
        "description": "Completa 10 rutas distintas.",
        "category": "completed_routes",
        "threshold_value": 10,
        "icon": "🏅",
        "rarity": "rare",
    },
    {
        "code": "completed_routes_25",
        "name": "Leyenda local",
        "description": "Sella 25 rutas completadas.",
        "category": "completed_routes",
        "threshold_value": 25,
        "icon": "🚩",
        "rarity": "epic",
    },
    {
        "code": "completed_routes_50",
        "name": "Maestro de rutas",
        "description": "Alcanza 50 rutas realizadas.",
        "category": "completed_routes",
        "threshold_value": 50,
        "icon": "🌌",
        "rarity": "legendary",
    },
]


async def ensure_completed_routes_seed() -> None:
    """
    Inserta o actualiza los logros de rutas completadas por defecto.
    """
    col = db_client.db[ACHIEVEMENTS_COLL]
    for ach in DEFAULT_COMPLETED_ROUTES_ACHIEVEMENTS:
        code = ach["code"]
        await col.update_one(
            {"code": code},
            {
                "$set": {
                    "name": ach["name"],
                    "description": ach["description"],
                    "category": ach["category"],
                    "threshold_value": ach["threshold_value"],
                    "icon": ach.get("icon"),
                    "rarity": ach.get("rarity"),
                }
            },
            upsert=True,
        )


async def get_completed_routes_count(user_id: str) -> int:
    """
    Devuelve el total de rutas marcadas como completadas para el usuario.
    """
    if "user_routes_completed" not in await db_client.db.list_collection_names():
        return 0
    return await db_client.db["user_routes_completed"].count_documents({"user_id": str(user_id)})


async def recalculate_completed_routes_achievements(user_id: str) -> list[Dict[str, Any]]:
    """
    Recalcula el progreso de logros basados en rutas completadas para un usuario.
    """
    await ensure_completed_routes_seed()
    count = await get_completed_routes_count(user_id)

    achievements = (
        await db_client.db[ACHIEVEMENTS_COLL]
        .find({"category": "completed_routes"})
        .sort("threshold_value", 1)
        .to_list(None)
    )
    progress_col = db_client.db[USER_ACHIEVEMENTS_COLL]

    newly_unlocked: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    for ach in achievements:
        ach_id = ach.get("_id")
        if ach_id is None:
            continue

        threshold = int(ach.get("threshold_value", 0))
        unlocked = count >= threshold

        existing = await progress_col.find_one(
            {"user_id": str(user_id), "achievement_id": ach_id},
            {"is_unlocked": 1, "unlocked_at": 1},
        )

        update: Dict[str, Any] = {"current_value": count}

        if existing is None:
            update["is_unlocked"] = unlocked
            update["unlocked_at"] = now if unlocked else None
            await progress_col.update_one(
                {"user_id": str(user_id), "achievement_id": ach_id},
                {"$set": update},
                upsert=True,
            )
            if unlocked:
                newly_unlocked.append(_serialize_achievement_unlock(ach, count, update["unlocked_at"]))
            continue

        # Ya existヴa progreso: solo cambiamos is_unlocked cuando se desbloquea por primera vez.
        if unlocked and not existing.get("is_unlocked"):
            update["is_unlocked"] = True
            update["unlocked_at"] = now
            newly_unlocked.append(_serialize_achievement_unlock(ach, count, now))
        else:
            # Conserva estado previo si no se desbloquea ahora.
            update["is_unlocked"] = existing.get("is_unlocked", False)
            if existing.get("unlocked_at"):
                update["unlocked_at"] = existing["unlocked_at"]

        await progress_col.update_one(
            {"user_id": str(user_id), "achievement_id": ach_id},
            {"$set": update},
            upsert=True,
        )

    return newly_unlocked


def _serialize_achievement_unlock(ach: dict[str, Any], current_value: int, unlocked_at: datetime | None) -> dict[str, Any]:
    return {
        "code": ach.get("code"),
        "name": ach.get("name"),
        "description": ach.get("description"),
        "category": ach.get("category"),
        "threshold_value": ach.get("threshold_value", 0),
        "icon": ach.get("icon"),
        "rarity": ach.get("rarity"),
        "current_value": current_value,
        "unlocked_at": unlocked_at,
    }


async def list_completed_routes_achievements(user_id: str) -> List[Dict[str, Any]]:
    """
    Devuelve el progreso de logros de rutas completadas para un usuario.
    """
    await recalculate_completed_routes_achievements(user_id)

    achievements = (
        await db_client.db[ACHIEVEMENTS_COLL]
        .find({"category": "completed_routes"})
        .sort("threshold_value", 1)
        .to_list(None)
    )
    ach_ids = [ach["_id"] for ach in achievements if "_id" in ach]
    progress_list = (
        await db_client.db[USER_ACHIEVEMENTS_COLL]
        .find({"user_id": str(user_id), "achievement_id": {"$in": ach_ids}})
        .to_list(None)
    )
    progress_map = {str(item.get("achievement_id")): item for item in progress_list}

    result: list[dict[str, Any]] = []
    for ach in achievements:
        ach_id = ach.get("_id")
        progress = progress_map.get(str(ach_id), {}) if ach_id is not None else {}
        result.append(
            {
                "code": ach.get("code"),
                "name": ach.get("name"),
                "description": ach.get("description"),
                "category": ach.get("category"),
                "threshold_value": ach.get("threshold_value", 0),
                "current_value": int(progress.get("current_value") or 0),
                "is_unlocked": bool(progress.get("is_unlocked", False)),
                "icon": ach.get("icon"),
                "rarity": ach.get("rarity"),
            }
        )

    return result
