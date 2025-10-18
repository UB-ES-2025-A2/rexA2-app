from fastapi import APIRouter, HTTPException, status, Depends
from db.models import route as route_crud
from db.schemas.route import RouteCreate, RoutePublic
from core.security import get_current_user

router = APIRouter(prefix="/routes", tags=["routes"])

@router.post('', response_model=RoutePublic, status_code=201)
async def create_route(payload: RouteCreate, current_user: dict = Depends(get_current_user)):
    '''
    Crea una nueva ruta asociada al usuario autenticado
    '''
    route = await route_crud.create_route(current_user["_id"], payload.dict())
    route["_id"] = str(route["_id"])
    return route

@router.get("", response_model=list[RoutePublic])
async def list_routes():
    '''
    Lista todas las rutas públicas
    '''
    routes = await route_crud.get_all_routes()
    for route in routes:
        route["_id"] = str(route["_id"])
    return routes

@router.get("/me", response_model=list[RoutePublic])
async def my_routes(current_user: dict = Depends(get_current_user)):
    '''
    Lista todas las rutas del usuario autenticado
    '''
    routes = await route_crud.get_routes_by_owner(current_user["_id"])
    for route in routes:
        route["_id"] = str(route["_id"])
    return routes


@router.get("/{route_id}", response_model=RoutePublic)
async def get_route(route_id: str, current_user: dict = Depends(get_current_user)):
    '''
    Obtiene una ruta por su ID si es pública o pertenece al usuario autenticado
    '''
    route = await route_crud.get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    if route["is_private"] and route["owner_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")
    
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