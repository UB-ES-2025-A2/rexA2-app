from fastapi import APIRouter, Depends, HTTPException, Query, status
from ..core.security import get_current_user
from ..db.models import user as user_crud
from ..db.schemas.user import UserProfile, UserUpdate, ProfileStats, UserPublic
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/users", tags=["users"])

# === NUEVO: datos básicos del usuario autenticado (como el response del registro) ===
@router.get("/me", response_model=UserPublic, response_model_exclude_none=True)
async def get_me(user = Depends(get_current_user)):
    return {
        "id": str(user["_id"]),
        "email": user.get("email"),
        "username": user.get("username"),
        "is_active": user.get("is_active", True),
    }

# Perfil completo (datos + métricas)
@router.get("/me/profile", response_model=UserProfile)
async def get_my_profile(user = Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado (datos personales + métricas).
    """
    return await user_crud.get_user_profile_dict(user)  # <-- faltaba await

@router.get("/check-username")
async def check_username(
    username: str = Query(..., min_length=3),
    user = Depends(get_current_user),
):
    """
    Prevalida disponibilidad de username (excluyendo el propio).
    """
    taken = await user_crud.is_username_taken(username, exclude_user_id=str(user["_id"]))
    return {"available": not taken}

@router.patch("/me", response_model=UserProfile)
async def update_my_profile(payload: UserUpdate, user = Depends(get_current_user)):
    """
    Edita campos opcionales del perfil (username, phone, preferred_units, avatar_url).
    No permite modificar contadores.
    """
    if payload.username:
        taken = await user_crud.is_username_taken(
            payload.username, exclude_user_id=str(user["_id"])
        )
        if taken:
            raise HTTPException(status_code=409, detail="Nombre de usuario no disponible")

    try:
        updated = await user_crud.update_user_fields(
            str(user["_id"]),
            username=payload.username,
            phone=payload.phone,
            preferred_units=payload.preferred_units,
            avatar_url=payload.avatar_url,
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Nombre de usuario no disponible")

    # Devolvemos perfil completo (datos + métricas) para refrescar el front
    return await user_crud.get_user_profile_dict(updated)

# ---- Stats agrupadas ----
@router.get("/me/stats", response_model=ProfileStats)
async def get_my_stats(user = Depends(get_current_user)):
    uid = str(user["_id"])
    return ProfileStats(
        routes_created=await user_crud.count_routes_created(uid),
        routes_completed=await user_crud.count_routes_completed(uid),
        routes_favorites=await user_crud.count_favorites(uid),
    )

# ---- Stats puntuales ----
@router.get("/me/stats/routes-created", response_model=dict)
async def get_my_routes_created_count(user = Depends(get_current_user)):
    uid = str(user["_id"])
    return {"count": await user_crud.count_routes_created(uid)}

@router.get("/me/stats/routes-completed", response_model=dict)
async def get_my_routes_completed_count(user = Depends(get_current_user)):
    uid = str(user["_id"])
    return {"count": await user_crud.count_routes_completed(uid)}

@router.get("/me/stats/favorites", response_model=dict)
async def get_my_favorites_count(user = Depends(get_current_user)):
    uid = str(user["_id"])
    return {"count": await user_crud.count_favorites(uid)}