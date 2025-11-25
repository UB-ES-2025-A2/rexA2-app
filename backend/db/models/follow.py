from datetime import datetime,timezone
from typing import List, Dict, Any, Optional
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
from ..client import get_db

FOLLOWS_COL = None

def _col():
    return FOLLOWS_COL or get_db()["follow"]

def _users():
    return get_db()["users"]

def _oid(_id: str) -> ObjectId:
    return ObjectId(_id)


def _safe_oid(_id: str) -> Optional[ObjectId]:
    try:
        return ObjectId(_id)
    except (InvalidId, Exception):
        return None

async def follow(follower_id: str, followee_id: str) -> Dict[str, Any]:
    if follower_id == followee_id:
        raise ValueError("No pudes seguir a ti mismo")
    
    col = _col()
    # Verificar que ambos usuarios existan:
    if not await _users().find_one({"_id": _oid(follower_id)}, {"_id": 1}) or \
        not await _users().find_one({"_id": _oid(followee_id)}, {"_id": 1}):
        raise ValueError("Usuario no encontrado")
    
    doc = {
        "follower_id": _oid(follower_id),
        "followee_id": _oid(followee_id),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        await col.insert_one(doc)
    except DuplicateKeyError:
        return {"ok": True, "already_following": True}
    return {"ok": True}

async def unfollow(follower_id: str, followee_id: str) -> Dict[str, Any]:
    col = _col()
    result = await col.delete_one({
        "follower_id": _oid(follower_id),
        "followee_id": _oid(followee_id)
    })

    print("[FOLLOW-CRUD] unfollow", {
        "follower_id": follower_id,
        "followee_id": followee_id,
        "deleted": result.deleted_count,
    })

    return {"ok": True}

async def is_following(follower_id: str, followee_id: str) -> bool:
    col = _col()

    filtro = {
        "follower_id": _oid(follower_id),
        "followee_id": _oid(followee_id),
    }
    doc = await col.find_one({
        "follower_id": _oid(follower_id),
        "followee_id": _oid(followee_id)
    }, {"_id": 1})

    print("[FOLLOW-CRUD] is_following", {
        "follower_id": follower_id,
        "followee_id": followee_id,
        "filter": filtro,
        "found": doc is not None,
    })

    return doc is not None

async def count_followers(user_id: str) -> int:
    """
    Devuelve el número de seguidores. Acepta string ObjectId y, en caso de que
    los datos se hayan almacenado como string, también cuenta esa variante.
    """
    try:
        col = _col()
    except RuntimeError:
        return 0
    oid = _safe_oid(user_id)
    filters = []
    if oid:
        filters.append({"followee_id": oid})
    filters.append({"followee_id": user_id})  # por si estuviera como string plano

    if len(filters) == 1:
        return await col.count_documents(filters[0])
    return await col.count_documents({"$or": filters})


async def count_following(user_id: str) -> int:
    try:
        col = _col()
    except RuntimeError:
        return 0
    oid = _safe_oid(user_id)
    filters = []
    if oid:
        filters.append({"follower_id": oid})
    filters.append({"follower_id": user_id})

    if len(filters) == 1:
        return await col.count_documents(filters[0])
    return await col.count_documents({"$or": filters})

async def list_followers(user_id: str, *, skip: int=0, limit: int=20) -> Dict[str, Any]:
    col = _col()
    pipeline = [
        {"$match": {"followee_id": _oid(user_id)}},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "follower_id",
            "foreignField": "_id",
            "as": "u"
        }},
        {"$unwind": "$u"},
        {"$project": {
            "_id": 0,
            "id": {"$toString": "$u._id"},
            "username": "$u.username",
            "avatar_url": "$u.avatar_url"
        }},
    ]

    items = [i async for i in col.aggregate(pipeline)]
    total = await col.count_documents({"followee_id": _oid(user_id)})
    return {"total": total, "items": items}

async def list_following(user_id: str, *, skip: int=0, limit: int=20) -> Dict[str, Any]:
    col = _col()

    pipeline = [
        {"$match": {"follower_id": _oid(user_id)}},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "followee_id",
            "foreignField": "_id",
            "as": "u"
        }},
        {"$unwind": "$u"},
        {"$project": {
            "_id": 0,
            "id": {"$toString": "$u._id"},
            "username": "$u.username",
            "avatar_url": "$u.avatar_url"
        }},
    ]
    items = [i async for i in col.aggregate(pipeline)]
    total = await col.count_documents({"follower_id": _oid(user_id)})
    return {"total": total, "items": items}
