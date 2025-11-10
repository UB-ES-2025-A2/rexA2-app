from fastapi import APIRouter, HTTPException, status, Depends
from backend.core.security import get_current_user
from backend.db.schemas.favorite import FavoriteListOut
from backend.db.models import favorite as favorite_crud
from backend.db.models import route as route_crud
from bson import ObjectId

router = APIRouter(prefix="/favorites", tags=["favorites"])



@router.post("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_favorite(route_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(route_id):
        raise HTTPException(status_code=400, detail="route_id inválido")

    route = await route_crud.get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if not route.get("visibility", False) and route.get("owner_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    await favorite_crud.add_favorite(current_user["_id"], route_id)
    return

@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(route_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(route_id):
        raise HTTPException(status_code=400, detail="route_id inválido")

    await favorite_crud.remove_favorite(current_user["_id"], route_id)
    return


@router.get("/me", response_model=FavoriteListOut)
async def list_my_favorites(current_user: dict = Depends(get_current_user)):
    """
    Devuelve la lista de IDs de rutas favoritas del usuario actual.
    Si el documento del usuario no existía, lo crea vacío.
    """
    route_ids = await favorite_crud.list_favorites(current_user["_id"])
    return {"route_ids": route_ids}
