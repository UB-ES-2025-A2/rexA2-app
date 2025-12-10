from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

import backend.db.client as db_client

ACHIEVEMENTS_COLL = "achievements"
USER_ACHIEVEMENTS_COLL = "user_achievements"

# === Seeds: rutas completadas ===
DEFAULT_COMPLETED_ROUTES_ACHIEVEMENTS: list[dict[str, Any]] = [
    {
        "code": "completed_routes_1",
        "name": "Explorador inicial",
        "description": "Completa tu primera ruta.",
        "category": "completed_routes",
        "threshold_value": 1,
        "icon": "compass-badge",
        "rarity": "common",
    },
    {
        "code": "completed_routes_5",
        "name": "Caminante constante",
        "description": "Marca 5 rutas como realizadas.",
        "category": "completed_routes",
        "threshold_value": 5,
        "icon": "boot-badge",
        "rarity": "common",
    },
    {
        "code": "completed_routes_10",
        "name": "Explorador experto",
        "description": "Completa 10 rutas distintas.",
        "category": "completed_routes",
        "threshold_value": 10,
        "icon": "medal-badge",
        "rarity": "rare",
    },
    {
        "code": "completed_routes_25",
        "name": "Leyenda local",
        "description": "Sella 25 rutas completadas.",
        "category": "completed_routes",
        "threshold_value": 25,
        "icon": "map-badge",
        "rarity": "epic",
    },
    {
        "code": "completed_routes_50",
        "name": "Maestro de rutas",
        "description": "Alcanza 50 rutas realizadas.",
        "category": "completed_routes",
        "threshold_value": 50,
        "icon": "trophy-badge",
        "rarity": "legendary",
    },
]

# === Seeds: rutas creadas ===
DEFAULT_CREATED_ROUTES_ACHIEVEMENTS: list[dict[str, Any]] = [
    {
        "code": "created_routes_1",
        "name": "Autor Novel",
        "description": "Publica tu primera ruta.",
        "category": "created_routes",
        "threshold_value": 1,
        "icon": "pen-badge",
        "rarity": "common",
    },
    {
        "code": "created_routes_3",
        "name": "Autor Activo",
        "description": "Publica 3 rutas.",
        "category": "created_routes",
        "threshold_value": 3,
        "icon": "toolkit-badge",
        "rarity": "common",
    },
    {
        "code": "created_routes_5",
        "name": "Autor Experto",
        "description": "Publica 5 rutas.",
        "category": "created_routes",
        "threshold_value": 5,
        "icon": "rocket-badge",
        "rarity": "rare",
    },
    {
        "code": "created_routes_10",
        "name": "Cartografo Amateur",
        "description": "Alcanza 10 rutas publicadas.",
        "category": "created_routes",
        "threshold_value": 10,
        "icon": "crane-badge",
        "rarity": "epic",
    },
    {
        "code": "created_routes_20",
        "name": "Cartografo Experto",
        "description": "Comparte 20 rutas.",
        "category": "created_routes",
        "threshold_value": 20,
        "icon": "castle-badge",
        "rarity": "legendary",
    },
]

# === Seeds: logros por tem?tica ===
THEME_DEFINITIONS: list[dict[str, Any]] = [
    {"id": "naturaleza", "name": "Naturaleza", "icon": "leaf-badge"},
    {"id": "gastronomia", "name": "Gastronomia", "icon": "plate-badge"},
    {"id": "exploracion-urbana", "name": "Exploracion urbana", "icon": "city-badge"},
    {"id": "aventura", "name": "Aventura", "icon": "climb-badge"},
    {"id": "cultura", "name": "Cultura", "icon": "mask-badge"},
    {"id": "deporte", "name": "Deporte", "icon": "run-badge"},
    {"id": "entretenimiento", "name": "Entretenimiento", "icon": "tent-badge"},
]

THEME_LEVELS = [
    ("level_1", 1, "Explorador"),
    ("level_2", 5, "Apasionado"),
    ("level_3", 10, "Leyenda"),
]

DISTANCE_ACHIEVEMENTS: list[dict[str, Any]] = [
    {"code": "distance_10", "name": "Caminante I", "threshold_value": 10, "icon": "track-badge", "rarity": "common"},
    {"code": "distance_25", "name": "Caminante II", "threshold_value": 25, "icon": "atlas-badge", "rarity": "common"},
    {"code": "distance_50", "name": "Caminante III", "threshold_value": 50, "icon": "camp-badge", "rarity": "rare"},
    {"code": "distance_100", "name": "Senderista", "threshold_value": 100, "icon": "peak-badge", "rarity": "epic"},
    {"code": "distance_250", "name": "Ultrawalker", "threshold_value": 250, "icon": "shield-badge", "rarity": "legendary"},
    {"code": "distance_500", "name": "Maratonista", "threshold_value": 500, "icon": "flag-badge", "rarity": "legendary"},
]

async def ensure_completed_routes_seed() -> None:
    col = db_client.db[ACHIEVEMENTS_COLL]
    for ach in DEFAULT_COMPLETED_ROUTES_ACHIEVEMENTS:
        await col.update_one(
            {"code": ach["code"]},
            {"$set": ach},
            upsert=True,
        )


async def ensure_created_routes_seed() -> None:
    col = db_client.db[ACHIEVEMENTS_COLL]
    for ach in DEFAULT_CREATED_ROUTES_ACHIEVEMENTS:
        await col.update_one(
            {"code": ach["code"]},
            {"$set": ach},
            upsert=True,
        )


async def ensure_theme_achievements_seed() -> None:
    col = db_client.db[ACHIEVEMENTS_COLL]
    for theme in THEME_DEFINITIONS:
        for level_code, threshold, label in THEME_LEVELS:
            code = f"theme_{theme['id']}_{level_code}"
            payload = {
                "code": code,
                "name": f"{label} de {theme['name']}",
                "description": f"Completa {threshold} rutas de {theme['name']}.",
                "category": "theme",
                "threshold_value": threshold,
                "icon": theme.get("icon"),
                "rarity": "common" if threshold <= 1 else "rare" if threshold == 5 else "epic",
                "theme_id": theme["id"],
            }
            await col.update_one({"code": code}, {"$set": payload}, upsert=True)

async def ensure_distance_achievements_seed() -> None:
    col = db_client.db[ACHIEVEMENTS_COLL]
    for ach in DISTANCE_ACHIEVEMENTS:
        payload = {
            "code": ach["code"],
            "name": ach["name"],
            "description": f"Acumula {ach['threshold_value']} km completados.",
            "category": "distance_travelled",
            "threshold_value": ach["threshold_value"],
            "icon": "🛤️",
            "rarity": ach.get("rarity"),
        }
        await col.update_one({"code": ach["code"]}, {"$set": payload}, upsert=True)


async def ensure_all_achievements_seed() -> None:
    await ensure_completed_routes_seed()
    await ensure_created_routes_seed()
    await ensure_theme_achievements_seed()
    await ensure_distance_achievements_seed()


async def get_completed_routes_count(user_id: str) -> int:
    if "user_routes_completed" not in await db_client.db.list_collection_names():
        return 0
    return await db_client.db["user_routes_completed"].count_documents({"user_id": str(user_id)})


async def recalculate_completed_routes_achievements(user_id: str) -> list[Dict[str, Any]]:
    await ensure_completed_routes_seed()
    count = await get_completed_routes_count(user_id)
    return await _recalculate_for_category(user_id, "completed_routes", count)


async def list_completed_routes_achievements(user_id: str) -> List[Dict[str, Any]]:
    await recalculate_completed_routes_achievements(user_id)
    return await _list_by_category(user_id, "completed_routes")


async def get_created_routes_count(user_id: str) -> int:
    if "routes" not in await db_client.db.list_collection_names():
        return 0
    return await db_client.db["routes"].count_documents({"owner_id": str(user_id), "visibility": True})


async def recalculate_created_routes_achievements(user_id: str) -> list[Dict[str, Any]]:
    await ensure_created_routes_seed()
    count = await get_created_routes_count(user_id)
    return await _recalculate_for_category(user_id, "created_routes", count)


async def list_created_routes_achievements(user_id: str) -> List[Dict[str, Any]]:
    await recalculate_created_routes_achievements(user_id)
    return await _list_by_category(user_id, "created_routes")


async def get_completed_routes_per_theme(user_id: str) -> dict[str, int]:
    if "user_routes_completed" not in await db_client.db.list_collection_names():
        return {}

    pipeline = [
        {"$match": {"user_id": str(user_id)}},
        {
            "$addFields": {
                "route_oid": {
                    "$convert": {
                        "input": "$route_id",
                        "to": "objectId",
                        "onError": None,
                        "onNull": None,
                    }
                }
            }
        },
        {"$match": {"route_oid": {"$ne": None}}},
        {
            "$lookup": {
                "from": "routes",
                "localField": "route_oid",
                "foreignField": "_id",
                "as": "route",
            }
        },
        {"$unwind": "$route"},
        {
            "$group": {
                "_id": {"$toLower": {"$ifNull": ["$route.theme", {"$ifNull": ["$route.category", "otros"]}]}},
                "count": {"$sum": 1},
            }
        },
    ]

    agg = await db_client.db["user_routes_completed"].aggregate(pipeline).to_list(length=None)
    return {doc["_id"]: int(doc.get("count", 0)) for doc in agg if doc.get("_id")}


async def recalculate_theme_achievements(user_id: str) -> list[Dict[str, Any]]:
    await ensure_theme_achievements_seed()
    counts = await get_completed_routes_per_theme(user_id)
    achievements = (
        await db_client.db[ACHIEVEMENTS_COLL]
        .find({"category": "theme"})
        .sort([("theme_id", 1), ("threshold_value", 1)])
        .to_list(None)
    )

    progress_col = db_client.db[USER_ACHIEVEMENTS_COLL]
    newly_unlocked: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    for ach in achievements:
        ach_id = ach.get("_id")
        if ach_id is None:
            continue
        theme_id = str(ach.get("theme_id") or "").lower()
        count = counts.get(theme_id, 0)
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

        if unlocked and not existing.get("is_unlocked"):
            update["is_unlocked"] = True
            update["unlocked_at"] = now
            newly_unlocked.append(_serialize_achievement_unlock(ach, count, now))
        else:
            update["is_unlocked"] = existing.get("is_unlocked", False)
            if existing.get("unlocked_at"):
                update["unlocked_at"] = existing["unlocked_at"]

        await progress_col.update_one(
            {"user_id": str(user_id), "achievement_id": ach_id},
            {"$set": update},
            upsert=True,
        )

    return newly_unlocked


async def list_theme_achievements(user_id: str) -> List[Dict[str, Any]]:
    await recalculate_theme_achievements(user_id)
    return await _list_by_category(user_id, "theme")


async def get_total_distance_completed(user_id: str) -> float:
    """
    Suma de distance_km de rutas completadas (únicas) por el usuario.
    """
    if "user_routes_completed" not in await db_client.db.list_collection_names():
        return 0.0
    pipeline = [
        {"$match": {"user_id": str(user_id)}},
        {
            "$addFields": {
                "route_oid": {
                    "$convert": {"input": "$route_id", "to": "objectId", "onError": None, "onNull": None}
                }
            }
        },
        {"$match": {"route_oid": {"$ne": None}}},
        {
            "$lookup": {
                "from": "routes",
                "localField": "route_oid",
                "foreignField": "_id",
                "as": "route",
            }
        },
        {"$unwind": "$route"},
        {
            "$group": {
                "_id": "$route_oid",
                "distance": {"$first": {"$ifNull": ["$route.distance_km", 0]}},
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$distance"}}},
    ]
    agg = await db_client.db["user_routes_completed"].aggregate(pipeline).to_list(length=1)
    total = float(agg[0].get("total", 0)) if agg else 0.0
    return round(total, 2)


async def recalculate_distance_achievements(user_id: str) -> list[Dict[str, Any]]:
    await ensure_distance_achievements_seed()
    total_km = await get_total_distance_completed(user_id)
    achievements = (
        await db_client.db[ACHIEVEMENTS_COLL]
        .find({"category": "distance_travelled"})
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
        threshold = float(ach.get("threshold_value", 0))
        unlocked = total_km >= threshold

        existing = await progress_col.find_one(
            {"user_id": str(user_id), "achievement_id": ach_id},
            {"is_unlocked": 1, "unlocked_at": 1},
        )

        update: Dict[str, Any] = {"current_value": total_km}

        if existing is None:
            update["is_unlocked"] = unlocked
            update["unlocked_at"] = now if unlocked else None
            await progress_col.update_one(
                {"user_id": str(user_id), "achievement_id": ach_id},
                {"$set": update},
                upsert=True,
            )
            if unlocked:
                newly_unlocked.append(_serialize_achievement_unlock(ach, total_km, update["unlocked_at"]))
            continue

        if unlocked and not existing.get("is_unlocked"):
            update["is_unlocked"] = True
            update["unlocked_at"] = now
            newly_unlocked.append(_serialize_achievement_unlock(ach, total_km, now))
        else:
            update["is_unlocked"] = existing.get("is_unlocked", False)
            if existing.get("unlocked_at"):
                update["unlocked_at"] = existing["unlocked_at"]

        await progress_col.update_one(
            {"user_id": str(user_id), "achievement_id": ach_id},
            {"$set": update},
            upsert=True,
        )

    return newly_unlocked


async def list_distance_achievements(user_id: str) -> List[Dict[str, Any]]:
    await recalculate_distance_achievements(user_id)
    return await _list_by_category(user_id, "distance_travelled")


def _serialize_achievement_unlock(ach: dict[str, Any], current_value: int, unlocked_at: datetime | None) -> dict[str, Any]:
    return {
        "code": ach.get("code"),
        "name": ach.get("name"),
        "description": ach.get("description"),
        "category": ach.get("category"),
        "threshold_value": ach.get("threshold_value", 0),
        "icon": ach.get("icon"),
        "rarity": ach.get("rarity"),
        "theme_id": ach.get("theme_id"),
        "current_value": current_value,
        "unlocked_at": unlocked_at,
    }


async def _list_by_category(user_id: str, category: str) -> List[Dict[str, Any]]:
    achievements = (
        await db_client.db[ACHIEVEMENTS_COLL]
        .find({"category": category})
        .sort([("theme_id", 1), ("threshold_value", 1)])
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
                "current_value": progress.get("current_value") or 0,
                "is_unlocked": bool(progress.get("is_unlocked", False)),
                "icon": ach.get("icon"),
                "rarity": ach.get("rarity"),
                "theme_id": ach.get("theme_id"),
            }
        )

    return result


async def _recalculate_for_category(user_id: str, category: str, count: int) -> list[Dict[str, Any]]:
    achievements = (
        await db_client.db[ACHIEVEMENTS_COLL]
        .find({"category": category})
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

        if unlocked and not existing.get("is_unlocked"):
            update["is_unlocked"] = True
            update["unlocked_at"] = now
            newly_unlocked.append(_serialize_achievement_unlock(ach, count, now))
        else:
            update["is_unlocked"] = existing.get("is_unlocked", False)
            if existing.get("unlocked_at"):
                update["unlocked_at"] = existing["unlocked_at"]

        await progress_col.update_one(
            {"user_id": str(user_id), "achievement_id": ach_id},
            {"$set": update},
            upsert=True,
        )

    return newly_unlocked
