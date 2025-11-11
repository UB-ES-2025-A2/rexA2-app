from fastapi import APIRouter, Depends
from core.security import get_current_user
from db.models import user as user_crud
from db.schemas.user import UserProfile

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/me/profile", response_model=UserProfile)
async def get_my_profile(user=Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado (datos personales + métricas)
    """
    return user_crud.get_user_profile_dict(user)
