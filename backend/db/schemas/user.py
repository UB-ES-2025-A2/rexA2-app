from pydantic import BaseModel, EmailStr, ConfigDict, field_validator    # Base para podelos, validador EmailStr
from typing import Literal, Optional
# Separación de modelos de entrada (UserCreate) y salida (UserPublic)


# Atributos comunes del usuario
class UserDB(BaseModel):
    email: EmailStr                     # Email
    username: str
    name: Optional[str] = None            # Nombre opcional
    phone: Optional[str] = None            # NEW
    preferred_units: Literal["km", "mi"] = "km"
    avatar_url: Optional[str] = None

# Datos requeridos para crear un usario
class UserCreate(UserDB):
    password: str

# Datos que se devuelven en respuesta pública
class UserPublic(UserDB):
    id: str                             # id de Mongo serializado (ObjectId -> str)
    is_active: bool                     # Estado de la cuenta
    model_config = ConfigDict(from_atributes=True)  # Permite crear desde dicts u objectos

# Payload para el login
class LogIn(BaseModel):
    email: EmailStr
    password: str

# Estructura de respuesta
class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# --- Perfil (el output que se verá en el frontend) ---
class ProfileStats(BaseModel):
    routes_created: int = 0
    routes_completed: int = 0
    routes_favorites: int = 0

class UserProfile(BaseModel):
    id: str
    username: str
    email: EmailStr
    phone: Optional[str] = None
    preferred_units: Literal["km", "mi"] = "km"
    avatar_url: Optional[str] = None
    stats: ProfileStats
    model_config = ConfigDict(from_attributes=True)

# --- Perfil público (que todo el mundo verá) sin datos sensibles ---
class UserProfilePublic(BaseModel):
    username: str
    avatar_url: Optional[str] = None
    stats: ProfileStats
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    # Definios todos como opcionales para hacer un PATCH
    username: Optional[str] = None
    phone: Optional[str] = None
    preferred_units: Optional[Literal["km", "mi"]] = None
    avatar_url: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def empty_to_none(cls, v):
        # Permite borrar el número mandando "", " "...
        if isinstance(v, str) and v.strip() == "":
            return None
        return v