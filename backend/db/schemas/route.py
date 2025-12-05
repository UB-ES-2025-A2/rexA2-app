from pydantic import BaseModel, Field, field_validator, AliasChoices
from typing import List
from datetime import datetime


class CommentCreate(BaseModel):
    content: str
    parent_id: str | None = None

    @field_validator("content")
    @classmethod
    def _content_present(cls, v: str):
        if not v.strip():
            raise ValueError("El comentario no puede estar vacío")
        return v


class CommentReply(BaseModel):
    id: str
    user_id: str
    username: str
    content: str
    created_at: datetime
    parent_id: str | None = None
    avatar_url: str | None = None


class CommentThread(CommentReply):
    replies: List[CommentReply] = Field(default_factory=list)


class CommentCreated(BaseModel):
    id: str
    user_id: str
    username: str
    content: str
    created_at: datetime
    parent_id: str | None = None
    avatar_url: str | None = None

# Modelo simple para representar un punto geográfico
class Point(BaseModel):
    latitude: float     # Lattitude en grados
    longitude: float    # Longtitude en grados

# Campos comunes para las rutas
class RouteBase(BaseModel):
    name: str                       # Nombre de la ruta
    points: List[Point]             # Lista ordenada de puntos que forman la ruta
    visibility: bool = False        # Visibilidad de la ruta públicamente (por defecto, no)
    description: str # | None = None  # Descripción de la ruta (opcional)
    category: str # | None = None     # Categoría opcional de la ruta
    country_code: str | None = Field(
        default=None,
        description="Código ISO del país (ej. ES, FR, IT)",
        max_length=3,
    )
    country_name: str | None = Field(
        default=None,
        description="Nombre legible del país (ej. España, Francia)",
        max_length=80,
    )
    images: List[str] = Field(        # URLs opcionales de imágenes asociadas a la ruta
        default_factory=list,
        description="Lista opcional de URLs de imágenes",
    )
    distance_km: float | None = Field(
        default=None,
        ge=0,
        description="Distancia aproximada en kilómetros (calculada automáticamente)",
    )
    duration_minutes: int | None = Field(   #Duración estimada en minutos, aun no implementado en el front
        default=None,
        ge=0,                           # >= 0
        description="Duración estimada en minutos (>= 0)",
    )
    difficulty: str | None = Field(
        default=None,
        description="Dificultad estimada (easy, medium, hard) calculada automáticamente",
    )
    rating: float | None = Field(          #Nota media de la ruta, aun no implemnentado en el front
        default=None,
        ge=0,
        le=5,                           # 0 <= rating <= 5
        description="Valoración media entre 0 y 5",
    )

    # Mensajes personalizacos (para que coincidan con la UI)
    @field_validator("points")
    @classmethod
    def _min_points(cls, v: List[Point]):
        if len(v) < 3:
            raise ValueError("Mínimo se han de seleccionar 3 puntos de interés")
        return v
    
    @field_validator("name")
    @classmethod
    def _name_present(cls, v: str):
        if not v.strip():
            raise ValueError("Falta añadir nombre a la ruta")
        if len(v) > 30:
            # Aunque el tipo ua limita a 30, esto fuerza el mensaje exacto
            raise ValueError("El nombre de la ruta debe tener menos de 30 caracteres")
        return v
    
    @field_validator("description")
    @classmethod
    def _desc_present(cls, v: str):
        if not v.strip():
            raise ValueError("Falta añadir una descripción a la ruta")
        return v
    
    @field_validator("category")
    @classmethod
    def _cat_present(cls, v: str):
        if not v.strip():
            raise ValueError("No se ha seleccionado ninguna categoría")
        return v

    @field_validator("images", mode="before")
    @classmethod
    def _images_valid(cls, v: list[str] | None):
        """
        Limpia y valida la lista de imágenes opcionales.
        - Si viene None, se normaliza a [].
        - Cada elemento debe ser un string no vacío (URL ya subida).
        - Se limita la cantidad máxima para evitar payloads enormes.
        """
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError("Las imágenes deben enviarse como una lista de URLs")
        cleaned: list[str] = []
        for item in v:
            if not isinstance(item, str):
                raise ValueError("Cada imagen debe ser una URL en formato texto")
            item = item.strip()
            if not item:
                raise ValueError("Las imágenes no pueden estar vacías")
            cleaned.append(item)
        if len(cleaned) > 10:
            raise ValueError("Máximo 10 imágenes por ruta")
        return cleaned
                
# Payload para crer una ruta: usa exactamente los campos de RouteBase
class RouteCreate(RouteBase):
    pass

# Representación pública de una ruta ya creada/guardada
class RoutePublic(RouteBase):
    id: str = Field(
        validation_alias=AliasChoices("_id", "id"),
        serialization_alias="id",
    )                               # Mapea el campo interno "_id" (de Mongo) a "id"
    owner_id: str                   # Identificador del propietario de la ruta    
    created_at: datetime            # Fecha y hora de la creación
    owner_username: str | None = None
    comments: List[CommentThread] = Field(default_factory=list)
    rating_count: int | None = None
    user_rating: float | None = None
    images: List[str] = Field(default_factory=list)


class RouteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    visibility: bool | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    difficulty: str | None = None
    country_code: str | None = Field(default=None, max_length=3)
    country_name: str | None = Field(default=None, max_length=80)

    @field_validator("name")
    @classmethod
    def _name_present(cls, v: str | None):
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Falta añadir nombre a la ruta")
        if len(v) > 30:
            raise ValueError("El nombre de la ruta debe tener menos de 30 caracteres")
        return v

    @field_validator("description")
    @classmethod
    def _desc_present(cls, v: str | None):
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Falta añadir una descripción a la ruta")
        return v

    @field_validator("category")
    @classmethod
    def _cat_present(cls, v: str | None):
        if v is None:
            return v
        if not v.strip():
            raise ValueError("No se ha seleccionado ninguna categoría")
        return v


class DiscoverRoute(BaseModel):
    id: str = Field(
        validation_alias=AliasChoices("_id", "id"),
        serialization_alias="id",
    )
    name: str
    country: str | None = None
    country_code: str | None = None
    country_name: str | None = None
    category: str | None = None
    theme: str | None = None
    distance_km: float | None = None
    duration_minutes: int | None = None
    rating: float | None = None
    rating_count: int | None = None
    difficulty: str | None = None
    images: List[str] = Field(default_factory=list)
    points: List[list[float]] = Field(default_factory=list)


class CountryDiscoverBlock(BaseModel):
    country: str
    routes: List[DiscoverRoute] = Field(default_factory=list)


class ThemeDiscoverBlock(BaseModel):
    theme: str
    routes: List[DiscoverRoute] = Field(default_factory=list)
