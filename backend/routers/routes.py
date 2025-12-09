import asyncio
import json
import io
import re
import urllib.parse
import urllib.request
from datetime import datetime
from functools import lru_cache
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from fastapi.responses import StreamingResponse
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
    RouteCreateResponse,
)
from backend.core.security import get_current_user, get_current_user_optional
from backend.db.schemas.rating import RatingPayload, RatingResponse, RatingStatsResponse
from backend.db.models import rating as rating_crud
from backend.db.models import completion as completion_crud
from backend.db.models import achievement as achievement_crud
from backend.db.schemas.completion import CompletionPayload, CompletionStatus
from backend.db.schemas.completion_list import CompletionList
from backend.core.events import rating_event_bus, rating_event_payload
from pymongo.errors import DuplicateKeyError
from bson.errors import InvalidId
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics

router = APIRouter(prefix="/routes", tags=["routes"])

def _with_images(route: dict | None) -> dict | None:
    """
    Normaliza el campo opcional de imágenes para no propagar None a los response_model.
    """
    if route is None:
        return None
    route["images"] = route.get("images") or []
    return route


def _slugify_filename(name: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9\-\s_.]", "-", name or "ruta")
    safe = re.sub(r"[\s_]+", "-", safe).strip("-")
    return safe.lower() or "ruta"


def _format_datetime(value: datetime | str | None) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.strftime("%Y-%m-%d %H:%M")
        except Exception:
            return value
    return "-"


def _normalize_points_for_pdf(points: list[dict] | None) -> list[tuple[float, float]]:
    normalized: list[tuple[float, float]] = []
    if not points:
        return normalized
    for p in points:
        try:
            if isinstance(p, dict):
                lng_raw = p.get("longitude", p.get("lng"))
                lat_raw = p.get("latitude", p.get("lat"))
            else:
                lng_raw = p[0]
                lat_raw = p[1]
            lng = float(lng_raw)
            lat = float(lat_raw)
            normalized.append((lng, lat))
        except Exception:
            continue
    return normalized


def _draw_badges(
    c: canvas.Canvas,
    texts: list[str],
    x: float,
    y: float,
    max_width: float,
    fill_color=colors.HexColor("#eef2ff"),
    text_color=colors.HexColor("#312e81"),
    font_name: str = "Helvetica-Bold",
    font_size: int = 9,
    padding_x: float = 6,
    padding_y: float = 4,
    radius: float = 6,
    gap: float = 6,
) -> float:
    """
    Dibuja badges en línea. Devuelve la nueva coordenada Y tras los badges.
    """
    c.setFont(font_name, font_size)
    badge_height = font_size + padding_y * 2
    ascent = pdfmetrics.getAscent(font_name) / 1000.0 * font_size
    descent = abs(pdfmetrics.getDescent(font_name)) / 1000.0 * font_size
    text_height = ascent + descent
    baseline_offset = (badge_height - text_height) / 2 + ascent
    cursor_x = x
    cursor_y = y
    for text in texts:
        text_width = c.stringWidth(text, font_name, font_size)
        badge_width = text_width + padding_x * 2
        if cursor_x + badge_width > max_width:
            cursor_x = x
            cursor_y -= badge_height + gap
        badge_y = cursor_y - badge_height
        c.setFillColor(fill_color)
        c.roundRect(cursor_x, badge_y, badge_width, badge_height, radius, stroke=0, fill=1)
        c.setFillColor(text_color)
        c.drawString(cursor_x + padding_x, badge_y + baseline_offset, text)
        cursor_x += badge_width + gap
    return cursor_y - (badge_height + gap)


def _draw_section_title(c: canvas.Canvas, title: str, x: float, y: float, color=colors.HexColor("#6366f1")) -> float:
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(color)
    bar_w, bar_h = 6, 10
    bar_y = y - (bar_h - 2)
    c.roundRect(x, bar_y, bar_w, bar_h, 3, stroke=0, fill=1)
    text_x = x + bar_w + 6
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(text_x, y, title)
    underline_width = max(60, c.stringWidth(title, "Helvetica-Bold", 12) + 4)
    c.setStrokeColor(color)
    c.setLineWidth(1.2)
    c.line(text_x, y - 2, text_x + underline_width, y - 2)
    return y - max(bar_h + 6, 18)


def _draw_divider(c: canvas.Canvas, x1: float, x2: float, y: float, color=colors.HexColor("#e5e7eb")) -> float:
    c.setStrokeColor(color)
    c.setLineWidth(0.8)
    c.line(x1, y, x2, y)
    return y - 10


@lru_cache(maxsize=128)
def _reverse_geocode(lat: float, lng: float) -> str | None:
    """
    Resolución ligera de coordenadas a dirección con Nominatim (OSM).
    Solo se usa para enriquecer el PDF; si falla, se omite silenciosamente.
    """
    try:
        params = urllib.parse.urlencode(
            {"format": "jsonv2", "lat": lat, "lon": lng, "zoom": 18, "addressdetails": 1}
        )
        url = f"https://nominatim.openstreetmap.org/reverse?{params}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "rex-app-pdf/1.0 (+contact@rex.local)",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("display_name")
    except Exception:
        return None


def _reverse_geocode_points(points: list[tuple[float, float]], limit: int = 10) -> dict[int, str]:
    """
    Enriquecemos con direcciones solo un subconjunto para evitar saturar el geocoder.
    Incluimos siempre inicio y fin, y hasta `limit` puntos totales.
    """
    if not points:
        return {}
    addresses: dict[int, str] = {}
    total = len(points)
    target_indices = {0, total - 1}
    for i in range(min(limit, total)):
        target_indices.add(i)
    for idx in sorted(target_indices):
        try:
            lng, lat = points[idx]
            addr = _reverse_geocode(lat, lng)
            if addr:
                addresses[idx] = addr
        except Exception:
            continue
    return addresses


def _draw_wrapped_text(c: canvas.Canvas, text: str, x: float, y: float, max_width: float, line_height: float, font_name: str = "Helvetica", font_size: int = 10) -> float:
    c.setFont(font_name, font_size)
    content = text or "-"
    for paragraph in str(content).split("\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            y -= line_height
            continue
        words = paragraph.split()
        line = ""
        for word in words:
            test_line = f"{line} {word}".strip()
            if c.stringWidth(test_line, font_name, font_size) <= max_width:
                line = test_line
            else:
                c.drawString(x, y, line)
                y -= line_height
                line = word
        if line:
            c.drawString(x, y, line)
            y -= line_height
    return y


def _draw_route_map(c: canvas.Canvas, points: list[tuple[float, float]], x: float, y: float, width: float, height: float):
    c.saveState()
    c.setStrokeColor(colors.HexColor("#d7ddf2"))
    c.setFillColor(colors.HexColor("#f5f7ff"))
    c.roundRect(x, y, width, height, 12, stroke=1, fill=1)
    c.setFillColor(colors.HexColor("#e0e7ff"))
    c.roundRect(x + 6, y + 6, width - 12, height - 12, 10, stroke=0, fill=1)

    if not points:
        c.setFillColor(colors.HexColor("#6b7280"))
        c.setFont("Helvetica", 10)
        c.drawString(x + 12, y + height / 2, "Sin puntos para mostrar")
        c.restoreState()
        return

    min_lng = min(p[0] for p in points)
    max_lng = max(p[0] for p in points)
    min_lat = min(p[1] for p in points)
    max_lat = max(p[1] for p in points)
    span_lng = max(max_lng - min_lng, 1e-6)
    span_lat = max(max_lat - min_lat, 1e-6)

    padding = 10
    usable_w = max(width - padding * 2, 1)
    usable_h = max(height - padding * 2, 1)

    def project(lng: float, lat: float) -> tuple[float, float]:
        px = x + padding + ((lng - min_lng) / span_lng) * usable_w
        py = y + padding + ((lat - min_lat) / span_lat) * usable_h
        return px, py

    projected = [project(lng, lat) for lng, lat in points]

    c.setStrokeColor(colors.HexColor("#7c3aed"))
    c.setLineWidth(2.4)
    for idx in range(1, len(projected)):
        x1, y1 = projected[idx - 1]
        x2, y2 = projected[idx]
        c.line(x1, y1, x2, y2)

    if projected:
        start_x, start_y = projected[0]
        end_x, end_y = projected[-1]
        c.setFillColor(colors.HexColor("#22c55e"))
        c.circle(start_x, start_y, 3, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#7c3aed"))
        c.circle(end_x, end_y, 3.6, fill=1, stroke=0)
        for px, py in projected:
            c.setFillColor(colors.HexColor("#111827"))
            c.circle(px, py, 1.6, fill=1, stroke=0)

    c.restoreState()


def _build_route_pdf(route: dict) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 2 * cm
    y = height - margin

    name = route.get("name") or "Ruta"
    description = (route.get("description") or "").strip()
    points = _normalize_points_for_pdf(route.get("points"))
    address_map = _reverse_geocode_points(points, limit=12)
    category = route.get("category") or "Sin categoría"
    visibility = "Pública" if route.get("visibility", False) else "Privada"
    distance = route.get("distance_km")
    duration = route.get("duration_minutes")
    difficulty = route.get("difficulty") or "-"
    rating = route.get("rating")
    rating_count = route.get("rating_count") or 0
    created_at = route.get("created_at") or route.get("createdAt")
    comments = route.get("comments") or []
    owner = route.get("owner_username")

    brand_primary = colors.HexColor("#6366f1")
    brand_secondary = colors.HexColor("#a855f7")
    neutral_ink = colors.HexColor("#0f172a")
    neutral_muted = colors.HexColor("#4b5563")

    # Cabecera
    c.setFillColor(brand_primary)
    c.rect(0, height - 64, width, 64, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin, height - 40, "REX · Ruta")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - margin, height - 40, _format_datetime(created_at))

    # Hero card con nombre y badges
    y = height - 92
    card_h = 84
    c.setFillColor(colors.white)
    c.roundRect(margin, y - card_h, width - 2 * margin, card_h, 12, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(1)
    c.roundRect(margin, y - card_h, width - 2 * margin, card_h, 12, stroke=1, fill=0)

    c.setFillColor(neutral_ink)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin + 12, y - 20, name)
    c.setFont("Helvetica", 10)
    c.setFillColor(neutral_muted)
    text_y = y - 36
    if owner:
        c.drawString(margin + 12, text_y, f"Autor: {owner}")
        text_y -= 14
    badge_texts: list[str] = []
    if category:
        badge_texts.append(f"Categoría: {category}")
    badge_texts.append(visibility)
    if distance is not None:
        badge_texts.append(f"{distance} km")
    if duration is not None:
        badge_texts.append(f"{duration} min")
    if difficulty and difficulty != "-":
        badge_texts.append(f"Dificultad: {difficulty}")
    if rating is not None:
        badge_texts.append(f"Rating: {rating}/5")
    y_badges = _draw_badges(
        c,
        badge_texts,
        x=margin + 12,
        y=text_y,
        max_width=width - margin,
        fill_color=colors.HexColor("#eef2ff"),
        text_color=colors.HexColor("#312e81"),
        font_size=9,
    )
    y = min(y - card_h - 4, y_badges - 2)
    y -= 12

    # Descripción
    if description:
        y = _draw_section_title(c, "Descripción", margin, y, color=brand_primary)
        y -= 4
        y = _draw_wrapped_text(c, description, margin + 2, y, width - margin * 2 - 4, 12)
        y -= 12

    # Detalles dinámicos
    details: list[str] = []
    details.append(f"Visibilidad: {visibility}")
    if category:
        details.append(f"Categoría: {category}")
    if distance is not None:
        details.append(f"Distancia: {distance} km")
    if duration is not None:
        details.append(f"Duración: {duration} min")
    if difficulty and difficulty != "-":
        details.append(f"Dificultad: {difficulty}")
    if rating is not None:
        details.append(f"Rating: {rating} / 5")
    if rating_count:
        details.append(f"Valoraciones: {rating_count}")
    if points:
        details.append(f"Puntos: {len(points)}")

    if details:
        y = _draw_section_title(c, "Detalles", margin, y, color=brand_secondary)
        y -= 2
        c.setFont("Helvetica", 10)
        c.setFillColor(neutral_muted)
        for line in details:
            c.drawString(margin + 2, y, line)
            y -= 12
        y -= 10

    # Mapa estilizado
    if points:
        map_height = 8 * cm
        y = _draw_section_title(c, "Mapa de la ruta", margin, y, color=brand_primary)
        y -= 4
        _draw_route_map(c, points, margin, y - map_height, width - 2 * margin, map_height)
        y -= map_height + 10
        start_addr = address_map.get(0)
        end_addr = address_map.get(len(points) - 1)
        c.setFont("Helvetica", 10)
        c.setFillColor(neutral_muted)
        if start_addr:
            y = _draw_wrapped_text(c, f"Inicio: {start_addr}", margin, y, width - 2 * margin, 12)
        if end_addr:
            y = _draw_wrapped_text(c, f"Fin: {end_addr}", margin, y, width - 2 * margin, 12)
        y -= 10

    # Lista de puntos
    if points:
        y = _draw_section_title(c, "Puntos (lon, lat)", margin, y, color=brand_secondary)
        c.setFont("Helvetica", 10)
        c.setFillColor(neutral_muted)
        max_points_to_show = 26
        for idx, (lng, lat) in enumerate(points[:max_points_to_show], start=1):
            c.drawString(margin, y, f"{idx:02d}. {lng:.5f}, {lat:.5f}")
            y -= 11
            addr = address_map.get(idx - 1)
            if addr:
                y = _draw_wrapped_text(c, addr, margin + 12, y, width - (margin * 2) - 12, 11)
                y -= 2
            if y < margin + 120:
                break
        if len(points) > max_points_to_show:
            c.drawString(margin, y, f"... (+{len(points) - max_points_to_show} puntos)")
            y -= 12
        y -= 6

    # Comentarios
    if comments:
        y = _draw_section_title(c, "Comentarios", margin, y, color=brand_primary)
        c.setFont("Helvetica", 10)
        c.setFillColor(neutral_muted)
        max_comments = 4
        for comment in comments[:max_comments]:
            author = comment.get("username") or "Anónimo"
            content = comment.get("content") or ""
            c.drawString(margin, y, f"- {author}:")
            y -= 12
            y = _draw_wrapped_text(c, content, margin + 12, y, width - (margin * 2) - 12, 11)
            y -= 6
            if y < margin + 80:
                break
        if len(comments) > max_comments:
            c.drawString(margin, y, f"... (+{len(comments) - max_comments} comentarios)")
            y -= 12

    c.showPage()
    c.save()
    return buffer.getvalue()


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

@router.post("", response_model=RouteCreateResponse, status_code=status.HTTP_201_CREATED)
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
    
    newly_unlocked = await achievement_crud.recalculate_created_routes_achievements(str(current_user["_id"]))
    route = _with_images(route)
    # Normalización _id para el response model (alias "_id" -> "id")
    route["_id"] = str(route["_id"])
    route["newly_unlocked"] = newly_unlocked
    return route

@router.get("", response_model=list[RoutePublic])
async def list_routes(
    public_only: bool=True,
    current_user: dict | None = Depends(get_current_user_optional),
):  # Parametro para elegir públicas o todas
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
    completed_set: set[str] = set()
    if current_user:
        try:
            completed_ids = await completion_crud.list_completed(str(current_user["_id"]))
            completed_set = {str(rid) for rid in completed_ids}
        except Exception:
            completed_set = set()

    for route in routes:
        route = _with_images(route)
        route["_id"] = str(route["_id"])
        if route.get("owner_id"):
            route["owner_username"] = owner_usernames.get(str(route["owner_id"]))
        route["is_completed"] = str(route.get("_id")) in completed_set
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
    if current_user:
        try:
            user_rating = await rating_crud.get_user_rating(str(current_user["_id"]), route_id)
        except Exception:
            user_rating = None
        if user_rating is not None:
            route["user_rating"] = user_rating
        try:
            route["is_completed"] = await completion_crud.is_completed(str(current_user["_id"]), route_id)
        except Exception:
            route["is_completed"] = False
    else:
        route["is_completed"] = False
    return route

@router.get("/{route_id}/pdf")
async def generate_route_pdf(
    route_id: str,
    current_user: dict | None = Depends(get_current_user_optional),
):
    """
    Genera un PDF con los datos principales de la ruta (incluyendo puntos y comentarios).
    Requiere que la ruta sea pública o que pertenezca al usuario autenticado.
    """
    route = await _ensure_route_access(route_id, current_user)
    route["_id"] = str(route.get("_id") or route.get("id") or route_id)

    try:
        stats = await rating_crud.get_route_rating_stats(route_id)
        avg = stats.get("average")
        route["rating"] = round(float(avg), 1) if avg is not None else route.get("rating")
        route["rating_count"] = stats.get("count", route.get("rating_count"))
    except Exception:
        # Si no se pueden obtener las stats, continuamos con los datos disponibles
        pass

    pdf_bytes = _build_route_pdf(route)
    filename = f"{_slugify_filename(route.get('name') or 'ruta')}-rex.pdf"
    headers = {"Content-Disposition": f'attachment; filename=\"{filename}\"'}
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


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


@router.get(
    "/completed/me",
    response_model=CompletionList,
    status_code=status.HTTP_200_OK,
)
async def list_my_completed_routes(current_user: dict = Depends(get_current_user)):
    """
    Devuelve la lista de IDs de rutas que el usuario autenticado marcó como completadas.
    """
    ids = await completion_crud.list_completed(str(current_user["_id"]))
    return {"route_ids": ids}


@router.get(
    "/{route_id}/completion",
    response_model=CompletionStatus,
    status_code=status.HTTP_200_OK,
)
async def get_route_completion_status(
    route_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve si la ruta está marcada como realizada por el usuario autenticado.
    Requiere que la ruta sea pública o que pertenezca al usuario.
    """
    await _ensure_route_access(route_id, current_user)
    completed = await completion_crud.is_completed(str(current_user["_id"]), route_id)
    return {"completed": completed}


@router.post(
    "/{route_id}/completion",
    response_model=CompletionStatus,
    status_code=status.HTTP_200_OK,
)
async def set_route_completion_status(
    route_id: str,
    payload: CompletionPayload,
    current_user: dict = Depends(get_current_user),
):
    """
    Marca o desmarca una ruta como realizada para el usuario autenticado.
    """
    await _ensure_route_access(route_id, current_user)

    user_id = str(current_user["_id"])
    newly_unlocked: list[dict] = []
    try:
        if payload.completed:
            await completion_crud.mark_completed(user_id, route_id)
        else:
            await completion_crud.unmark_completed(user_id, route_id)
        newly_unlocked = await achievement_crud.recalculate_completed_routes_achievements(user_id)
    except Exception:
        # Evitamos filtrar detalles de persistencia al cliente
        raise HTTPException(status_code=500, detail="No se pudo actualizar el estado de la ruta")

    for optional_recalc in (
        achievement_crud.recalculate_theme_achievements,
        achievement_crud.recalculate_distance_achievements,
    ):
        try:
            extra_unlocks = await optional_recalc(user_id)
            if extra_unlocks:
                newly_unlocked = (newly_unlocked or []) + extra_unlocks
        except Exception:
            # Si no se pueden recalcular estos logros opcionales, no bloqueamos la operaciÇün principal.
            continue

    return {"completed": payload.completed, "newly_unlocked": newly_unlocked or []}


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
