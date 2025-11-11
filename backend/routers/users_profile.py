from fastapi import APIRouter, Depends, HTTPException, Query, status
from core.security import get_current_user
from db.models import user as user_crud
from db.schemas.user import UserProfile, UserUpdate
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/me/profile", response_model=UserProfile)
async def get_my_profile(user=Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado (datos personales + métricas)
    """
    return user_crud.get_user_profile_dict(user)

@router.get("/check-username")
async def check_username(username: str = Query(..., min_length=3), user = Depends(get_current_user)):
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
    # si viene username, validamos disponibilidad
    if payload.username:
        taken = await user_crud.is_username_taken(payload.username, exclude_user_id=str(user["_id"]))
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
        # por si lo captura el índice único
        raise HTTPException(status_code=409, detail="Nombre de usuario no disponible")

    # devolvemos el perfil completo (datos + métricas)
    # para que el front se refresque con una sola llamada
    return await user_crud.get_user_profile_dict(updated)