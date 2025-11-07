from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError                      # Librería para firmar/verificar JWT
from passlib.context import CryptContext            # Framework para hasing seguro (bcrypt)
from fastapi import HTTPException, Request, status
from backend.core.config import settings

# Configuración del hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    ''''
    Genera un hash bcrypt
    '''
    return pwd_context.hash(password)

def verify_password(plain: str, hashed:str) -> bool:
    '''
    Comprueba si una contraseña coincide con su hash
    '''
    return pwd_context.verify(plain, hashed)

# Creación de tokens
def _create_token(sub: str, expires_delta: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,                                      # De quien es el token (email del usuario)
        "type": token_type,                              # Acces o refresh
        "iat": int(now.timestamp()),                     # Fecha de emisión
        "exp": int((now + expires_delta).timestamp()),   # Fecha de expiración
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_access_token(sub: str) -> str:
    return _create_token(sub, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), 'access')

def create_refresh_token(sub: str) -> str:
    return _create_token(sub, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), 'refresh')

def decode_token(token: str) -> dict:
    '''
    Decodifica y valida la firma de un JWT.
    '''
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail='Token inválido')
    
# Dependencia para obtener usuario auteticado
async def get_current_user(request: Request):
    from backend.db.models import user as user_crud             # Acceso a funciones CURD del usuario

    '''
    Extrae el usuario actual desde cookie o header Bearer
    '''
    token = request.cookies.get("access_token")
    if not token and (auth := request.headers.get("Authorization")):
        token = auth.split(" ", 1)[1]

    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    
    data = decode_token(token)
    if data.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token inválido")

    user = await user_crud.get_user_by_email(data["sub"])

    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Usuario no disponible")
    
    return user