from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Dict, Any
from ..db.models import user as user_crud
from ..db.schemas.user import UserCreate, UserPublic


router = APIRouter(prefix="/users", tags=["users"])

@router.post('', response_model=UserPublic, status_code=201)
async def register_user(payload: UserCreate):
    '''
    Registra un usuario si el email no existe
    '''
    existing = await user_crud.get_user_by_email(payload.email)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Email ya registrado"
        )
    
    user = await user_crud.create_user(
        email=payload.email,
        password=payload.password,
        username=payload.username,
        theme_preference=payload.theme_preference,
    )

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "username": user.get("username"),
        "theme_preference": user.get("theme_preference"),
        #"name": user.get("name"),
        #"phone": user.get("phone"),
        #"preferred_units": user.get("preferred_units") or "km",
        #"avatar_url": user.get("avatar_url"),
        "is_active": user["is_active"],
    }

@router.get("/search")
async def search_users_endpoint(
    q: str = Query(..., min_length=1, description="Texto a buscar"),
    limit: int = Query(20, ge=1, le=50),
) -> List[Dict[str, Any]]:
    """
    Devuelve usuarios que coincidan parcial o totalmente en name, username o email.
    """

    try:
        result = await user_crud.search_users(q, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail="No se han podido cargar los resultados")
    return result