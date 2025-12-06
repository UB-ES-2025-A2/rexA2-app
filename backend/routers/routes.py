import asyncio
import json
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from sse_starlette.sse import EventSourceResponse
from backend.db.models import route as route_crud
from backend.db.models import user as user_crud
from backend.db.schemas.route import (
    RouteCreate,
    RoutePublic,
    RouteUpdate,
    CommentCreate,
    CommentThread,
    CommentCreated,
    CountryDiscoverBlock,
    ThemeDiscoverBlock,
)
from backend.core.security import get_current_user, get_current_user_optional
from backend.db.schemas.rating import RatingPayload, RatingResponse, RatingStatsResponse
from backend.core.security import get_current_user
from backend.db.models import rating as rating_crud
from backend.core.events import rating_event_bus, rating_event_payload
from pymongo.errors import DuplicateKeyError
from bson.errors import InvalidId

router = APIRouter(prefix="/routes", tags=["routes"])

def _with_images(route: dict | None) -> dict | None:
    """
    Normaliza el campo opcional de imágenes para no propagar None a los response_model.
    """
    if route is None:
        return None
    route["images"] = route.get("images") or []
    return route


async def _ensure_route_access(route_id: str, current_user: dict | None) -> dict:
    """
    Devuelve la ruta si el usuario puede acceder a ella; lanza HTTPException en caso contrario.
    """
    try:
        route = await route_crud.get_route_by_id(route_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    route = _with_images(route)

    is_public = bool(route.get("visibility"))
    # Si no hay usuario, is_owner es False
    is_owner = False
    if current_user:
        is_owner = str(route.get("owner_id")) == str(current_user["_id"])

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
    
    route = _with_images(route)
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
        route = _with_images(route)
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


@router.get("/discover/countries", response_model=list[CountryDiscoverBlock])
async def discover_by_countries(
    limit_per_country: int = Query(6, ge=1, le=10),
    max_countries: int = Query(10, ge=1, le=20),
    country: str | None = Query(None, description="Filtra por país/region (case-insensitive)"),
    theme: str | None = Query(None, description="Filtra por temática"),
):
    """
    Rutas destacadas agrupadas por país/región.
    Criterio: rating desc, luego recencia.
    """
    blocks = await route_crud.get_featured_by_country(
        limit_per_country=limit_per_country,
        max_countries=max_countries,
        country_filter=country,
        theme_filter=theme,
    )
    return blocks


@router.get("/discover/themes", response_model=list[ThemeDiscoverBlock])
async def discover_by_themes(
    limit_per_theme: int = Query(6, ge=1, le=10),
    max_themes: int = Query(10, ge=1, le=20),
    country: str | None = Query(None, description="Filtra por país/region (case-insensitive)"),
    theme: str | None = Query(None, description="Filtra por temática"),
):
    """
    Rutas destacadas agrupadas por temática (theme/category).
    """
    blocks = await route_crud.get_featured_by_theme(
        limit_per_theme=limit_per_theme,
        max_themes=max_themes,
        country_filter=country,
        theme_filter=theme,
    )
    return blocks

@router.get("/{route_id}", response_model=RoutePublic)
async def get_route(
    route_id: str,
    request: Request,
    current_user: dict | None = Depends(get_current_user_optional),
):
    '''
    Obtiene una ruta por su ID si es pública o pertenece al usuario autenticado
    '''
    if current_user is None:
        # En tests se inyecta un override de get_current_user_optional; respetarlo manualmente
        for dep in (get_current_user_optional, get_current_user):
            override_fn = request.app.dependency_overrides.get(dep)
            if override_fn:
                current_user = await override_fn(request)
                break
    route = _with_images(await route_crud.get_route_by_id(route_id))
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    is_public = bool(route.get("visibility"))
    is_owner = False
    if current_user:
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

@router.put("/{route_id}", response_model=RoutePublic)
async def update_route_endpoint(
    route_id: str,
    payload: RouteCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza una ruta propia. Mantiene compatibilidad con clients que no envían imágenes (se normalizan a []).
    """
    try:
        existing = await route_crud.get_route_by_id(route_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if not existing:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if str(existing.get("owner_id")) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")

    # Evita duplicar nombres dentro del mismo owner (salvo que sea la misma ruta)
    duplicate = await route_crud.get_route_by_name(current_user["_id"], payload.name)
    if duplicate and str(duplicate.get("_id")) != str(route_id):
        raise HTTPException(status_code=409, detail="Este nombre de ruta ya existe")

    updated = await route_crud.update_route(route_id, current_user["_id"], payload.model_dump())
    if not updated:
        # No coincide el owner o no existe
        raise HTTPException(status_code=403, detail="No autorizado o ruta inexistente")

    updated = _with_images(updated)
    updated["_id"] = str(updated["_id"])
    return updated

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
    # Notificamos al resto de clientes conectados para que refresquen el rating
    asyncio.create_task(
        rating_event_bus.publish(
            rating_event_payload(route_id, result.get("average"), result.get("count"))
        )
    )
    return result


@router.get(
    "/{route_id}/rating",
    response_model=RatingStatsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_route_rating_stats(
    route_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve la media (redondeada a 1 decimal) y el total de valoraciones de una ruta.
    Requiere que la ruta sea pública o pertenezca al usuario autenticado.
    """
    await _ensure_route_access(route_id, current_user)
    stats = await rating_crud.get_route_rating_stats(route_id)
    avg = stats.get("average")
    stats["average"] = round(float(avg), 1) if avg is not None else None
    return stats


@router.get("/ratings/stream")
async def rating_event_stream():
    """
    Stream SSE para avisar cuando cambia el rating de una ruta.
    No requiere autenticación porque solo envía métricas agregadas públicas.
    """
    queue = await rating_event_bus.subscribe()

    async def event_generator():
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=25)
                    yield {
                        "event": payload.get("type", "rating_update"),
                        "data": json.dumps(payload),
                    }
                except asyncio.TimeoutError:
                    # Heartbeat para mantener viva la conexión en proxies intermedios
                    yield {"event": "heartbeat", "data": "keep-alive"}
        except asyncio.CancelledError:
            # El cliente cerró la conexión
            raise
        finally:
            await rating_event_bus.unsubscribe(queue)

    return EventSourceResponse(event_generator())

@router.get("/by-name/{name}", response_model=RoutePublic)
async def get_public_route_by_name(name: str, current_user: dict = Depends(get_current_user)):
    """
    Devuelve una ruta PÚBLICA por nombre.
    - 200 si existe (pública)
    - 404 si no existe o es privada
    """
    route = _with_images(await route_crud.get_public_route_by_name(name))
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
    route_id: str, current_user: dict | None = Depends(get_current_user_optional)
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
