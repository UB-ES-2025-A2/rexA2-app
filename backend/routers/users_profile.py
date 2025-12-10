from fastapi import APIRouter, Depends, HTTPException, Query, status
from ..core.security import get_current_user
from ..db.models import user as user_crud
from ..db.models import route as route_crud
from ..db.schemas.user import UserProfile, UserUpdate, ProfileStats, UserPublic
from ..db.schemas.route import RoutePublic
from ..db.models import favorite as favorite_crud
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/users", tags=["users"])

# === Datos básicos del usuario autenticado (como el response del registro) ===
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

# --- Getter para ver las rutas favoritas ---
@router.get("/me/routes/favorites", response_model=list[RoutePublic])
async def list_my_favorite_routes(
    user = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Devuelve el listado de rutas favoritas
    """
    # Obtener IDs de favoritos (crea doc vacío si no existía)
    fav_ids = await favorite_crud.list_favorites(str(user["_id"]))
    if not fav_ids:
        return []

    # Paginación sobre IDs
    page_ids = fav_ids[skip : skip + limit]
    docs = await route_crud.get_routes_by_ids(page_ids)  
    # Mantener orden original de favoritos
    order = {rid: i for i, rid in enumerate(page_ids)}
    docs.sort(key=lambda d: order.get(d.get("_id") or d.get("id"), 10**9))

    # Mapear owner_id a username para mostrar nombres en el front
    owner_ids = {str(d.get("owner_id")) for d in docs if d.get("owner_id")}
    owner_usernames: dict[str, str | None] = {}
    for owner_id in owner_ids:
        user_doc = await user_crud.get_user_by_id(owner_id)
        if user_doc:
            owner_usernames[owner_id] = user_doc.get("username") or user_doc.get("email")
        else:
            owner_usernames[owner_id] = None

    # Mapear a RoutePublic
    payload = [
        RoutePublic(
            **{k: v for k, v in d.items() if k != "_id"},
            owner_username=owner_usernames.get(str(d.get("owner_id"))),
            **{"_id": d.get("_id") or d.get("id")}
        )
        for d in docs
    ]
    return payload
