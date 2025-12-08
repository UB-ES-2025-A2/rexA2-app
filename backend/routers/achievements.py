from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.security import get_current_user
from backend.db.models import achievement as achievement_crud
from backend.db.schemas.achievement import AchievementProgress

router = APIRouter(prefix="/api/users", tags=["achievements"])


@router.get(
    "/{user_id}/achievements/completed-routes",
    response_model=list[AchievementProgress],
    status_code=status.HTTP_200_OK,
)
async def get_completed_routes_achievements(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve el progreso de logros de rutas completadas del usuario autenticado.
    """
    if str(current_user.get("_id")) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    return await achievement_crud.list_completed_routes_achievements(user_id)
