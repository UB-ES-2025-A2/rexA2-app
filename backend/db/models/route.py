
import json
import math
from pathlib import Path
import backend.db.client as db_client
from bson import ObjectId
from datetime import datetime, timezone
from uuid import uuid4
from typing import Any

COUNTRY_BBOXES = [
    {"code": "ES", "name": "España", "lat_min": 27.0, "lat_max": 44.5, "lon_min": -19.0, "lon_max": 5.0},
    {"code": "FR", "name": "Francia", "lat_min": 41.0, "lat_max": 51.5, "lon_min": -5.5, "lon_max": 9.9},
    {"code": "PT", "name": "Portugal", "lat_min": 36.8, "lat_max": 42.3, "lon_min": -9.6, "lon_max": -6.0},
    {"code": "IT", "name": "Italia", "lat_min": 36.0, "lat_max": 47.2, "lon_min": 6.5, "lon_max": 19.0},
    {"code": "CL", "name": "Chile", "lat_min": -56.5, "lat_max": -17.5, "lon_min": -76.0, "lon_max": -66.0},
    {"code": "US", "name": "Estados Unidos", "lat_min": 24.5, "lat_max": 49.5, "lon_min": -125.0, "lon_max": -66.5},
    {"code": "CA", "name": "Canadá", "lat_min": 41.6, "lat_max": 83.1, "lon_min": -141.0, "lon_max": -52.6},
]

COUNTRY_POLYGONS: list[dict[str, Any]] = []
GEOJSON_PATH = Path(__file__).resolve().parents[2] / "assets" / "countries.geojson"
if GEOJSON_PATH.exists():
    try:
        data = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            code = props.get("ISO_A2") or props.get("iso_a2") or props.get("code")
            name = props.get("ADMIN") or props.get("admin") or props.get("name")
            geom = feature.get("geometry", {})
            if not code or not name or not geom:
                continue
            COUNTRY_POLYGONS.append({"code": code, "name": name, "geometry": geom})
        if COUNTRY_POLYGONS:
            print(f"[COUNTRY] Cargados {len(COUNTRY_POLYGONS)} países desde GeoJSON")
    except Exception as e:
        print(f"[COUNTRY] No se pudo cargar GeoJSON de países ({e}); usando bounding boxes por defecto")


def _guess_country_from_points(points: list[dict]) -> tuple[str | None, str | None]:
    """
    Estima el país principal usando, en orden:
    1) Polígonos cargados desde GeoJSON (si existe assets/countries.geojson).
    2) Bounding boxes de fallback.
    Devuelve (code, name) o (None, None) si no se puede determinar.
    """
    if not points:
        return (None, None)

    def point_in_polygon(lon: float, lat: float, geom: dict) -> bool:
        """
        Algoritmo winding simple para Polygons/Multipolygons en lon/lat.
        """
        def poly_contains(coords: list[list[float]]) -> bool:
            inside = False
            j = len(coords) - 1
            for i in range(len(coords)):
                xi, yi = coords[i][0], coords[i][1]
                xj, yj = coords[j][0], coords[j][1]
                intersect = ((yi > lat) != (yj > lat)) and (
                    lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-9) + xi
                )
                if intersect:
                    inside = not inside
                j = i
            return inside

        geom_type = geom.get("type")
        coords = geom.get("coordinates", [])
        if geom_type == "Polygon":
            # coords: [ [ [lon, lat], ... ] , ...]
            if not coords:
                return False
            return poly_contains(coords[0])
        if geom_type == "MultiPolygon":
            for poly in coords:
                if poly and poly_contains(poly[0]):
                    return True
        return False

    counts: dict[str, int] = {}
    for p in points:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            lon, lat = float(p[0]), float(p[1])
        else:
            lat = float(p.get("latitude", p.get("lat", 0)))
            lon = float(p.get("longitude", p.get("lng", 0)))

        found = False
        for feat in COUNTRY_POLYGONS:
            if point_in_polygon(lon, lat, feat["geometry"]):
                code = feat["code"]
                counts[code] = counts.get(code, 0) + 1
                found = True
                break
        if found:
            continue

        for bbox in COUNTRY_BBOXES:
            if bbox["lat_min"] <= lat <= bbox["lat_max"] and bbox["lon_min"] <= lon <= bbox["lon_max"]:
                code = bbox["code"]
                counts[code] = counts.get(code, 0) + 1
                break

    if not counts:
        return (None, None)
    best_code = max(counts, key=counts.get)
    best = next((b for b in COUNTRY_POLYGONS if b.get("code") == best_code), None) or next(
        (b for b in COUNTRY_BBOXES if b["code"] == best_code), None
    )
    return (best_code, best.get("name") if best else None)

def _normalize(doc: dict) -> dict:
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    # Normaliza campos opcionales para evitar None en la capa API
    if "images" not in d or d.get("images") is None:
        d["images"] = []
    # Asegura tipos compatibles con los esquemas de respuesta
    if "duration_minutes" in d and isinstance(d.get("duration_minutes"), float):
        d["duration_minutes"] = int(round(d["duration_minutes"]))
    if "country_code" not in d:
        d["country_code"] = None
    if "country_name" not in d:
        d["country_name"] = None
    return d


def _discover_projection(doc: dict) -> dict:
    """
    Proyección simplificada para bloques de descubrimiento.
    """
    d = _normalize(doc)
    country_name = (
        doc.get("country_name")
        or doc.get("country")
        or doc.get("region")
        or "Desconocido"
    )
    country_code = doc.get("country_code")
    d["theme"] = doc.get("theme") or doc.get("category") or "otros"
    def _project_points(pts: list) -> list[list[float]]:
        out: list[list[float]] = []
        for p in pts:
            if isinstance(p, (list, tuple)) and len(p) >= 2:
                out.append([float(p[0]), float(p[1])])
            elif isinstance(p, dict):
                lon = p.get("longitude", p.get("lng"))
                lat = p.get("latitude", p.get("lat"))
                if lon is None or lat is None:
                    continue
                out.append([float(lon), float(lat)])
        return out
    return {
        "id": d.get("_id") or d.get("id"),
        "name": d.get("name"),
        "country": country_name,
        "country_code": country_code,
        "country_name": country_name,
        "theme": d.get("theme"),
        "category": d.get("category"),
        "distance_km": d.get("distance_km"),
        "duration_minutes": d.get("duration_minutes"),
        "rating": d.get("rating"),
        "rating_count": d.get("rating_count"),
        "difficulty": d.get("difficulty"),
        "images": d.get("images") or [],
        "points": _project_points(d.get("points") or []),
    }

# ============ CREATE OPERATIONS ============
async def create_route(owner_id: str, route_data:dict) -> dict:
    '''
    Crea una nueva ruta asociada a un usuario
    '''
    distance_km = _calculate_distance_km(route_data["points"])
    # Si no se envía duration_minutes, dejamos None (tests esperan que no se estime automáticamente)
    duration_minutes = route_data.get("duration_minutes")
    difficulty = _normalize_difficulty(route_data.get("difficulty")) or _estimate_difficulty(distance_km, duration_minutes)
    country_code, country_name = _guess_country_from_points(route_data["points"])

    route = {
        "owner_id": str(owner_id),
        "name": route_data["name"],
        "points": route_data["points"],
        "visibility": route_data.get("visibility", False),
        "description": route_data["description"],
        "category": route_data["category"],
        "theme": route_data.get("theme") or route_data.get("category"),
        "created_at": datetime.now(timezone.utc),
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
        "difficulty": difficulty,
        "rating": route_data.get("rating"),
        "rating_count": route_data.get("rating_count") or 0,
        "images": route_data.get("images") or [],
        "comments": [],
        "country_code": route_data.get("country_code") or country_code,
        "country_name": route_data.get("country_name") or country_name,
    }

    result = await db_client.db["routes"].insert_one(route)
    route["_id"] = result.inserted_id
    return route

async def get_route_by_id(route_id: str) -> dict | None:
    '''
    Devuelve una ruta por su ID o None si no existe
    '''
    doc = await db_client.db["routes"].find_one({"_id": ObjectId(route_id)})
    return _normalize(doc) if doc else None


async def get_routes_by_ids(route_ids: list[str]) -> list[dict]:
    oids = []
    for s in route_ids:
        try:
            oids.append(ObjectId(s))
        except Exception:
            continue
    if not oids:
        return []
    
    curr = db_client.db["routes"].find({"_id": {"$in": oids}})
    out = []
    async for d in curr:
        out.append(_normalize(d))

    return out

async def get_all_routes(public_only: bool = False) -> list[dict]:
    """Obtiene todas las rutas (públicas o todas si admin)."""
    query = {"visibility": True} if public_only else {}
    routes = await db_client.db["routes"].find(query).to_list(length=None)
    return [_normalize(r) for r in routes]

# ---- Aquí obtenemos la lista de rutas que crea un usuario ---
async def get_routes_by_owner(owner_id: str, *, public_only: bool | None = None,
                            skip: int = 0, limit: int = 50) -> list[dict]:
    '''
    Devuelve todas las rutas de un usuario
    '''
    q =  {"owner_id": str(owner_id)}
    if public_only is True:
        q["visibility"] = True

    cur = db_client.db["routes"].find(q).skip(int(skip)).limit(int(limit))

    return [_normalize(d) async for d in cur]

async def get_route_by_name(owner_id: str, name: str) -> dict | None:
    return await db_client.db["routes"].find_one({
        "owner_id": str(owner_id),
        "name": name
    })


async def get_public_route_by_name(name: str) -> dict | None:
    """
    Busca una ruta por su nombre sin importar el propietario.
    """
    found = await db_client.db["routes"].find_one({
        "name": name,
        "visibility": True,
    })
    return _normalize(found) if found else None


async def add_comment(
    route_id: str,
    *,
    user_id: str,
    username: str,
    content: str,
    parent_id: str | None = None,
    avatar_url: str | None = None,
) -> dict | None:
    """
    Inserta un comentario o respuesta en la ruta.
    Devuelve el documento de comentario insertado o None si no se pudo insertar (p.e. padre inexistente).
    """
    now = datetime.now(timezone.utc)
    comment_id = str(uuid4())

    if parent_id:
        reply_doc = {
            "id": comment_id,
            "user_id": user_id,
            "username": username,
            "content": content,
            "created_at": now,
            "parent_id": parent_id,
            "avatar_url": avatar_url,
        }
        result = await db_client.db["routes"].update_one(
            {"_id": ObjectId(route_id), "comments.id": parent_id},
            {"$push": {"comments.$.replies": reply_doc}},
        )
        if result.modified_count == 0:
            return None
        return reply_doc

    comment_doc = {
        "id": comment_id,
        "user_id": user_id,
        "username": username,
        "content": content,
        "created_at": now,
        "parent_id": None,
        "replies": [],
        "avatar_url": avatar_url,
    }
    result = await db_client.db["routes"].update_one(
        {"_id": ObjectId(route_id)},
        {"$push": {"comments": comment_doc}},
    )
    if result.modified_count == 0:
        return None
    return comment_doc

# ============ DELETE OPERATIONS ============
async def delete_route(route_id: str, user_id: str) -> bool:
    '''
    Elimina una ruta solo si pertenece al usuario.
    '''
    result = await db_client.db["routes"].delete_one({"_id": ObjectId(route_id), "owner_id": str(user_id)})
    return result.deleted_count == 1


async def update_route(route_id: str, owner_id: str, data: dict) -> dict | None:
    """
    Actualiza los campos de una ruta si pertenece al usuario.
    Devuelve el documento actualizado o None si no existe o no pertenece al usuario.
    """
    # Filtra campos permitidos y normaliza valores opcionales
    allowed_fields = {
        "name",
        "description",
        "category",
        "visibility",
        "duration_minutes",
        "difficulty",
        "country_code",
        "country_name",
        "points",
        "rating",
        "images",
    }

    payload: dict[str, any] = {}
    for key in allowed_fields:
        if key not in data:
            continue
        val = data.get(key)
        if key == "images":
            payload[key] = val or []
        elif val is not None:
            payload[key] = val
        elif key in {"visibility", "rating"}:
            # Estos campos pueden actualizarse explícitamente a None/False
            payload[key] = val

    if "category" in payload:
        payload["theme"] = payload.get("theme") or payload["category"]

    if not payload:
        return await get_route_by_id(route_id)

    # Añade país calculado si se modifican puntos (este update admite puntos)
    if "points" in payload and payload["points"] is not None:
        code, name = _guess_country_from_points(payload["points"])
        payload["country_code"] = payload.get("country_code", code)
        payload["country_name"] = payload.get("country_name", name)

    result = await db_client.db["routes"].update_one(
        {"_id": ObjectId(route_id), "owner_id": str(owner_id)},
        {"$set": payload},
    )
    if result.matched_count == 0:
        return None

    updated = await get_route_by_id(route_id)
    if updated:
        updated.update(payload)
    return updated
# ================== HELPERS ==================
def _to_radians(value: float) -> float:
    return (value * math.pi) / 180.0


def _calculate_segment_km(a: dict, b: dict) -> float:
    """
    Calcula la distancia Haversine entre dos puntos en kilómetros.
    Espera diccionarios con keys latitude y longitude.
    """
    lat1, lon1 = float(a["latitude"]), float(a["longitude"])
    lat2, lon2 = float(b["latitude"]), float(b["longitude"])
    dlat = _to_radians(lat2 - lat1)
    dlon = _to_radians(lon2 - lon1)
    rlat1 = _to_radians(lat1)
    rlat2 = _to_radians(lat2)

    haversine = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))
    earth_radius_km = 6371
    return earth_radius_km * c


def _calculate_distance_km(points: list[dict]) -> float | None:
    """
    Calcula la distancia total de la ruta sumando los tramos consecutivos.
    Devuelve None si no hay suficientes puntos.
    """
    if not points or len(points) < 2:
        return None
    total = 0.0
    for idx in range(1, len(points)):
        total += _calculate_segment_km(points[idx - 1], points[idx])
    return round(total, 2)


def _estimate_duration_minutes(distance_km: float | None) -> float | None:
    """
    Estimación sencilla de duración asumiendo 4 km/h (60 min/h).
    """
    if distance_km is None:
        return None
    avg_speed_kmh = 4
    minutes = (distance_km / avg_speed_kmh) * 60
    return int(round(minutes))


def _estimate_difficulty(distance_km: float | None, duration_minutes: float | None) -> str | None:
    """
    Asigna una dificultad básica en función de distancia/duración.
    """
    if distance_km is None and duration_minutes is None:
        return None

    distance = distance_km or 0
    duration = duration_minutes or 0

    if distance > 20 or duration > 360:
        return "hard"
    if distance > 10 or duration > 180:
        return "medium"
    return "easy"


def _normalize_difficulty(value) -> str | None:
    if not value:
        return None
    v = str(value).lower().strip()
    if v in {"easy", "media", "medium"}:
        return "medium" if v.startswith("m") else "easy"
    if v in {"hard", "dificil", "difícil", "alta"}:
        return "hard"
    if v in {"facil", "fácil"}:
        return "easy"
    return v


async def get_featured_by_country(
    *,
    limit_per_country: int = 6,
    max_countries: int = 10,
    country_filter: str | None = None,
    theme_filter: str | None = None,
) -> list[dict]:
    """
    Devuelve rutas destacadas agrupadas por país/region.
    Criterio de destacado: rating desc, rating_count desc, created_at desc.
    """
    country_filter_norm = country_filter.lower().strip() if country_filter else None
    theme_filter_norm = theme_filter.lower().strip() if theme_filter else None

    pipeline = [
        {
            "$addFields": {
                "effective_rating": {"$ifNull": ["$rating", 0]},
                "effective_rating_count": {"$ifNull": ["$rating_count", 0]},
                "country_name": {
                    "$ifNull": [
                        "$country_name",
                        {"$ifNull": ["$country", {"$ifNull": ["$region", "Desconocido"]}]},
                    ]
                },
                "country_code": {"$ifNull": ["$country_code", None]},
                "country": {
                    "$ifNull": [
                        "$country_name",
                        {"$ifNull": ["$country", {"$ifNull": ["$region", "Desconocido"]}]},
                    ]
                },
                "theme": {"$ifNull": ["$theme", {"$ifNull": ["$category", "otros"]}]},
            }
        },
        {"$match": {"visibility": True}},
    ]

    if country_filter_norm:
        pipeline.append(
            {
                "$match": {
                    "$expr": {
                        "$or": [
                            {
                                "$eq": [
                                    {"$toLower": "$country_code"},
                                    country_filter_norm,
                                ]
                            },
                            {
                                "$eq": [
                                    {"$toLower": "$country"},
                                    country_filter_norm,
                                ]
                            },
                            {
                                "$eq": [
                                    {"$toLower": "$country_name"},
                                    country_filter_norm,
                                ]
                            },
                        ]
                    }
                }
            }
        )

    if theme_filter_norm:
        pipeline.append(
            {
                "$match": {
                    "$expr": {
                        "$eq": [
                            {"$toLower": "$theme"},
                            theme_filter_norm,
                        ]
                    }
                }
            }
        )

    pipeline.extend(
        [
            {
                "$sort": {
                    "effective_rating": -1,
                    "effective_rating_count": -1,
                    "created_at": -1,
                }
            },
            {
                "$group": {
                    "_id": "$country",
                    "routes": {"$push": "$$ROOT"},
                }
            },
            {"$limit": int(max_countries)},
            {
                "$project": {
                    "_id": 0,
                    "country": "$_id",
                    "routes": {"$slice": ["$routes", int(limit_per_country)]},
                }
            },
        ]
    )

    cursor = db_client.db["routes"].aggregate(pipeline)
    blocks: list[dict] = []
    async for doc in cursor:
        blocks.append(
            {
                "country": doc.get("country") or "Desconocido",
                "routes": [_discover_projection(r) for r in doc.get("routes", [])],
            }
        )
    return blocks


async def get_featured_by_theme(
    *,
    limit_per_theme: int = 6,
    max_themes: int = 10,
    country_filter: str | None = None,
    theme_filter: str | None = None,
) -> list[dict]:
    """
    Devuelve rutas destacadas agrupadas por temática (theme/category).
    """
    country_filter_norm = country_filter.lower().strip() if country_filter else None
    theme_filter_norm = theme_filter.lower().strip() if theme_filter else None

    pipeline = [
        {
            "$addFields": {
                "effective_rating": {"$ifNull": ["$rating", 0]},
                "effective_rating_count": {"$ifNull": ["$rating_count", 0]},
                "theme": {"$ifNull": ["$theme", {"$ifNull": ["$category", "otros"]}]},
                "country_name": {
                    "$ifNull": [
                        "$country_name",
                        {"$ifNull": ["$country", {"$ifNull": ["$region", "Desconocido"]}]},
                    ]
                },
                "country_code": {"$ifNull": ["$country_code", None]},
                "country": {
                    "$ifNull": [
                        "$country_name",
                        {"$ifNull": ["$country", {"$ifNull": ["$region", "Desconocido"]}]},
                    ]
                },
            }
        },
        {"$match": {"visibility": True}},
    ]

    if country_filter_norm:
        pipeline.append(
            {
                "$match": {
                    "$expr": {
                        "$or": [
                            {
                                "$eq": [
                                    {"$toLower": "$country_code"},
                                    country_filter_norm,
                                ]
                            },
                            {
                                "$eq": [
                                    {"$toLower": "$country"},
                                    country_filter_norm,
                                ]
                            },
                            {
                                "$eq": [
                                    {"$toLower": "$country_name"},
                                    country_filter_norm,
                                ]
                            },
                        ]
                    }
                }
            }
        )

    if theme_filter_norm:
        pipeline.append(
            {
                "$match": {
                    "$expr": {
                        "$eq": [
                            {"$toLower": "$theme"},
                            theme_filter_norm,
                        ]
                    }
                }
            }
        )

    pipeline.extend(
        [
            {
                "$sort": {
                    "effective_rating": -1,
                    "effective_rating_count": -1,
                    "created_at": -1,
                }
            },
            {
                "$group": {
                    "_id": "$theme",
                    "routes": {"$push": "$$ROOT"},
                }
            },
            {"$limit": int(max_themes)},
            {
                "$project": {
                    "_id": 0,
                    "theme": "$_id",
                    "routes": {"$slice": ["$routes", int(limit_per_theme)]},
                }
            },
        ]
    )

    cursor = db_client.db["routes"].aggregate(pipeline)
    blocks: list[dict] = []
    async for doc in cursor:
        blocks.append(
            {
                "theme": doc.get("theme") or "otros",
                "routes": [_discover_projection(r) for r in doc.get("routes", [])],
            }
        )
    return blocks
