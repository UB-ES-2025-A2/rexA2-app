from pydantic import BaseModel, EmailStr, ConfigDict    # Base para podelos, validador EmailStr

# Separación de modelos de entrada (UserCreate) y salida (UserPublic)


# Atributos comunes del usuario
class UserDB(BaseModel):
    email: EmailStr                     # Email
    username: str
    name: str | None = None             # Nombre opcional

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