# Conexión con MongoDB
from motor.motor_asyncio import AsyncIOMotorClient  # Cliente asíncorno oficial de MongoDB
from core.config import settings                    # Importamos la configuración global

client: AsyncIOMotorClient | None = None            # Variable global para el cliente
db = None                                           # Referencia global a la base de datos


async def init_db():
    '''
    Crea el cliente y selecciona la base de datos al arrancar la app.
    '''
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI) # Se conecta usando la uri del .env
    db = client[settings.DATABASE_NAME]             # Selecciona la base concreta (rex)
