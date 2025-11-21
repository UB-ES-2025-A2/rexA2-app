from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from ..client import get_db

FOLLOWS_COL = None

def _col():
    return FOLLOWS_COL or get_db()["follow"]

def _users():
    return get_db()["users"]

def _oid(_id: str) -> ObjectId:
    return ObjectId(_id)

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
        "created_at": datetime.utcnow(),
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
    col = _col()
    return await col.count_documents({"followee_id": _oid(user_id)})

async def count_following(user_id: str) -> int:
    col = _col()
    return await col.count_documents({"follower_id": _oid(user_id)})

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
