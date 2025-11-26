from fastapi import APIRouter, Depends, HTTPException, Query, status
from ..core.security import get_current_user
from ..db.models import follow as follow_crud
from ..db.schemas.follow import FollowActionResponse, FollowersList

router = APIRouter(prefix="/users", tags=["follow"])

@router.post("/{user_id}/follow", response_model=FollowActionResponse, status_code=201)
async def follow_user(user_id: str, me = Depends(get_current_user)):
    if str(me["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="No puedes seguirte a ti ismo")

    try:
        await follow_crud.follow(str(me["_id"]), user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}

@router.delete("/{user_id}/follow", response_model=FollowActionResponse, status_code=200)
async def unfollow_user(user_id: str, me = Depends(get_current_user)):
    await follow_crud.unfollow(str(me["_id"]), user_id)
    return {"ok": True}

@router.get("/{user_id}/followers", response_model=FollowersList)
async def get_followers(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _: dict = Depends(get_current_user),
):
    return await follow_crud.list_followers(user_id, skip=skip, limit=limit)

@router.get("/{user_id}/following", response_model=FollowersList)
async def get_following(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _: dict = Depends(get_current_user),
):
    return await follow_crud.list_following(user_id, skip=skip, limit=limit)

@router.get("/{user_id}/is-following", response_model=dict)
async def get_is_following(user_id: str, me = Depends(get_current_user)):
    return {"is_following": await follow_crud.is_following(str(me["_id"]), user_id)}
