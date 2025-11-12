from fastapi import APIRouter, HTTPException, status, Depends, Query
from backend.db.models import route as route_crud
from backend.db.models import user as user_crud
from backend.db.schemas.route import RouteCreate, RoutePublic
from backend.core.security import get_current_user
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/routes", tags=["routes"])

@router.get("/check-name")
async def check_name(name: str = Query(..., min_length=1), current_user: dict = Depends(get_current_user)):
    """
    Devuelve {"exists": true|false} si el nombre ya existe para el usuario autenticado.
    """
    exists = await route_crud.get_route_by_name(current_user["_id"], name) is not None
    return {"exists": exists}

# @router.post("", response_model=RoutePublic, status_code=201)
# async def create_route(payload: RouteCreate, current_user: dict = Depends(get_current_user)):
#     '''
#     Crea una nueva ruta asociada al usuario autenticado
#     '''
#     route = await route_crud.create_route(current_user["_id"], payload.dict())
#     route["_id"] = str(route["_id"])
#     return route

@router.post("", response_model=RoutePublic, status_code=status.HTTP_201_CREATED)
async def create_route_endpoint(payload: RouteCreate, current_user: dict = Depends(get_current_user)):
    """
    Crea una ruta. Valida unicidad del nombre y delega validaciones de formato a Pydantic.
    """
    if await route_crud.get_route_by_name(current_user["_id"], payload.name):
        raise HTTPException(status_code=409, detail="Este nombre de ruta ya existe")
    
    try:
        route = await route_crud.create_route(current_user["_id"], payload.model_dump())
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Este nombre de ruta ya existe")
    
    # Normalización _id para el response model (alias "_id" -> "id")
    route["_id"] = str(route["_id"])
    return route

@router.get("", response_model=list[RoutePublic])
async def list_routes(public_only: bool=True):  # Parametro para elegir públicas o todas
    '''
    Lista todas las rutas públicas
    '''
    routes = await route_crud.get_all_routes(public_only)
    for route in routes:
        route["_id"] = str(route["_id"])
    return routes

@router.get("/me", response_model=list[RoutePublic])
async def my_routes(current_user: dict = Depends(get_current_user),
                    skip: int = Query(0, ge=0),
                    limit: int = Query(50, ge=1, le=200),
):
    '''
    Lista todas las rutas del usuario autenticado
    '''
    routes = await route_crud.get_routes_by_owner(current_user["_id"], public_only=None, skip=skip, limit=limit)
    return routes

@router.get("/user/{username}", response_model=list[RoutePublic])
async def list_user_public_routes(
    username: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Lista rutas PÚBLICAS de un usuario por su username.
    """
    u = await user_crud.get_user_by_username(username)
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    routes = await route_crud.get_routes_by_owner(
        u["_id"], public_only=True, skip=skip, limit=limit
    )
    return routes

@router.get("/{route_id}", response_model=RoutePublic)
async def get_route(route_id: str, current_user: dict = Depends(get_current_user)):
    '''
    Obtiene una ruta por su ID si es pública o pertenece al usuario autenticado
    '''
    route = await route_crud.get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    is_public = bool(route.get("visibility"))
    is_owner = route.get("owner_id") == current_user["_id"]

    if not is_public and not is_owner:
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")
    
    route["_id"] = str(route["_id"])
    return route

@router.get("/by-name/{name}", response_model=RoutePublic)
async def get_public_route_by_name(name: str, current_user: dict = Depends(get_current_user)):
    """
    Devuelve una ruta PÚBLICA por nombre.
    - 200 si existe (pública)
    - 404 si no existe o es privada
    """
    route = await route_crud.get_public_route_by_name(name)
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    route["_id"] = str(route["_id"])
    return route

@router.delete("/{route_id}", status_code=204)
async def delete_route(route_id: str, current_user: dict = Depends(get_current_user)):
    '''
    Elimina una ruta por su ID si pertenece al usuario autenticado
    '''
    ok = await route_crud.delete_route(route_id, current_user["_id"])
    if not ok:
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")
    return None