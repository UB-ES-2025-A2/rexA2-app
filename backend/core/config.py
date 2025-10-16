# Calse base que mapea variables de entorno a atributos tipados
from pydantic_settings import BaseSettings
# Tipado para listas (CORS_ORIGINS)
from typing import List


# Definimos un modelo de configuración que lee del entorno .env.
class Settings(BaseSettings):
    # NOTE incluir la key del env
    PROJECT_NAME: str = "Rex API"
    MONGODB_URI: str                              # URI de MongoDB Atlas; sin valorpor defecto -> obligatorio
    DATABASE_NAME: str = "rex"

    SECRET_KEY: str                             # Clave secreta para firmar JWT; obligatoria
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: List[str]

    # Config inerna de Pydantic Settings
    class Config:
        env_file = '../.env'           # Carga variables del archivo .env en la raíz del proyecto

settings = Settings()               # Instancia que se evalúa al importar: lee .ven y valida tipos
