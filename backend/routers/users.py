from fastapi import APIRouter, HTTPException, status
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
        #name=payload.name,
        #phone=payload.phone,
        #preferred_units=payload.preferred_units,
        #avatar_url=payload.avatar_url,
    )

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "username": user.get("username"),
        #"name": user.get("name"),
        #"phone": user.get("phone"),
        #"preferred_units": user.get("preferred_units") or "km",
        #"avatar_url": user.get("avatar_url"),
        "is_active": user["is_active"],
    }