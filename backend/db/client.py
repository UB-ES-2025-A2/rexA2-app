# Conexión con MongoDB
from motor.motor_asyncio import AsyncIOMotorClient  # Cliente asíncorno oficial de MongoDB
from backend.core.config import settings                    # Importamos la configuración global

client: AsyncIOMotorClient | None = None            # Variable global para el cliente
db = None                                           # Referencia global a la base de datos


async def init_db():
    '''
    Crea el cliente y selecciona la base de datos al arrancar la app.
    '''
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI) # Se conecta usando la uri del .env
    db = client[settings.DATABASE_NAME]             # Selecciona la base concreta (rex)

async def ensure_indexes():
    """
    - Unicidad de (owner_id, name) para evitar duplicados bajo concurrencia
    """
    await db["routes"].create_index(
        [("owner_id", 1), ("name", 1)],
        unique=True,
        name="u_owner_name",
        # collation={"locale": "es", "strength": 2}  # opcional: insensible a mayúsculas/minúsculas
    )