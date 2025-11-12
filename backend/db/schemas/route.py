from pydantic import BaseModel, Field, field_validator, AliasChoices
from typing import List
from datetime import datetime

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
    duration_minutes: int | None = Field(   #Duración estimada en minutos, aun no implementado en el front
        default=None,
        ge=0,                           # >= 0
        description="Duración estimada en minutos (>= 0)",
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
