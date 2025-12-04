from fastapi import APIRouter, HTTPException, status, Depends, Query
from backend.db.models import route as route_crud
from backend.db.models import user as user_crud
from backend.db.schemas.route import (
    RouteCreate,
    RoutePublic,
    RouteUpdate,
    CommentCreate,
    CommentThread,
    CommentCreated,
)
from backend.db.schemas.rating import RatingPayload, RatingResponse
from backend.core.security import get_current_user
from backend.db.models import rating as rating_crud
from pymongo.errors import DuplicateKeyError
from bson.errors import InvalidId

router = APIRouter(prefix="/routes", tags=["routes"])


async def _ensure_route_access(route_id: str, current_user: dict) -> dict:
    """
    Devuelve la ruta si el usuario puede acceder a ella; lanza HTTPException en caso contrario.
    """
    try:
        route = await route_crud.get_route_by_id(route_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    is_public = bool(route.get("visibility"))
    is_owner = route.get("owner_id") == current_user["_id"]

    if not is_public and not is_owner:
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")

    return route

@router.get("/check-name")
async def check_name(name: str = Query(..., min_length=1), current_user: dict = Depends(get_current_user)):
    """
    Devuelve {"exists": true|false} si el nombre ya existe para el usuario autenticado.
    """
    exists = await route_crud.get_route_by_name(current_user["_id"], name) is not None
    return {"exists": exists}

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

    # Mapear owner_id -> username/email para que el front muestre el autor
    owner_ids = {str(r.get("owner_id")) for r in routes if r.get("owner_id")}
    owner_usernames: dict[str, str | None] = {}
    for oid in owner_ids:
        try:
            user_doc = await user_crud.get_user_by_id(oid)
        except RuntimeError:
            # Entorno de test sin DB inicializada: omitimos enriquecer
            user_doc = None
        if user_doc:
            owner_usernames[oid] = user_doc.get("username") or user_doc.get("email")
        else:
            owner_usernames[oid] = None

    for route in routes:
        route["_id"] = str(route["_id"])
        if route.get("owner_id"):
            route["owner_username"] = owner_usernames.get(str(route["owner_id"]))
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
    is_owner = str(route.get("owner_id")) == str(current_user["_id"])

    if not is_public and not is_owner:
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")
    
    route["_id"] = str(route["_id"])
    route["is_owner"] = is_owner  # ← NUEVO
    try:
        user_rating = await rating_crud.get_user_rating(str(current_user["_id"]), route_id)
    except Exception:
        user_rating = None
    if user_rating is not None:
        route["user_rating"] = user_rating
    return route

@router.get("/{route_id}/ownership")
async def check_route_ownership(
    route_id: str, current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Devuelve si la ruta pertenece al usuario autenticado.
    """
    try:
        route = await route_crud.get_route_by_id(route_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    is_owner = str(route.get("owner_id")) == str(current_user.get("_id"))
    return {"is_owner": is_owner}

@router.post(
    "/{route_id}/rating",
    response_model=RatingResponse,
    status_code=status.HTTP_200_OK,
)
async def rate_route(
    route_id: str,
    payload: RatingPayload,
    current_user: dict = Depends(get_current_user),
):
    """
    Guarda o actualiza la valoración de una ruta (1-5) para el usuario autenticado.
    - No permite valorar rutas privadas de otros usuarios.
    - No permite que el autor valore su propia ruta.
    """
    try:
        route = await route_crud.get_route_by_id(route_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    is_owner = str(route.get("owner_id")) == str(current_user["_id"])
    if is_owner:
        raise HTTPException(status_code=403, detail="No puedes valorar tu propia ruta")

    if not route.get("visibility", False):
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")

    result = await rating_crud.set_user_rating(
        str(current_user["_id"]), route_id, payload.rating
    )
    return result

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


@router.put("/{route_id}", response_model=RoutePublic)
async def update_route(
    route_id: str,
    payload: RouteUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza una ruta si pertenece al usuario autenticado.
    """
    try:
        route = await route_crud.get_route_by_id(route_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if str(route.get("owner_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")

    updated = await route_crud.update_route(route_id, current_user["_id"], payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=400, detail="No se pudo actualizar la ruta")

    updated["_id"] = str(updated["_id"])
    updated["is_owner"] = True
    return updated


@router.get(
    "/{route_id}/comments",
    response_model=list[CommentThread],
)
async def list_route_comments(
    route_id: str, current_user: dict = Depends(get_current_user)
):
    """
    Devuelve los comentarios de una ruta si es pública o el usuario es el propietario.
    """
    route = await _ensure_route_access(route_id, current_user)
    return route.get("comments", [])


@router.post(
    "/{route_id}/comments",
    response_model=CommentCreated,
    status_code=status.HTTP_201_CREATED,
)
async def add_route_comment(
    route_id: str,
    payload: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Añade un comentario o respuesta a una ruta.
    - Si `parent_id` viene informado, se añade como respuesta de ese comentario.
    """
    route = await _ensure_route_access(route_id, current_user)

    if payload.parent_id:
        has_parent = any(
            c.get("id") == payload.parent_id for c in route.get("comments", [])
        )
        if not has_parent:
            raise HTTPException(status_code=404, detail="Comentario padre no encontrado")

    username = (
        current_user.get("username")
        or current_user.get("name")
        or current_user.get("email")
        or "usuario"
    )
    avatar_url = current_user.get("avatar_url")

    created = await route_crud.add_comment(
        route_id,
        user_id=str(current_user["_id"]),
        username=username,
        content=payload.content,
        parent_id=payload.parent_id,
        avatar_url=avatar_url,
    )

    if not created:
        raise HTTPException(status_code=404, detail="Comentario padre no encontrado")

    # Devuelve solo los datos relevantes (las claves extras son ignoradas por el schema)
    created["username"] = created.get("username") or username
    created["parent_id"] = payload.parent_id
    created["avatar_url"] = created.get("avatar_url") or avatar_url
    return created

@router.delete("/{route_id}", status_code=204)
async def delete_route(route_id: str, current_user: dict = Depends(get_current_user)):
    '''
    Elimina una ruta por su ID si pertenece al usuario autenticado
    '''
    print(f"[DELETE] Route ID: {route_id}")
    print(f"[DELETE] User ID: {current_user.get('_id')} (type: {type(current_user.get('_id'))})")
    
    ok = await route_crud.delete_route(route_id, str(current_user["_id"]))
    if not ok:
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")
    return None
