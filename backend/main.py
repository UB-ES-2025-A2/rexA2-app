from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from core.config import settings
from db.client import init_db
from routers import users, auth

# Documentation at http://127.0.0.1:8000/docs
app = FastAPI(title=settings.PROJECT_NAME)              # Instancia principal.

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,                # Orígenes permitidos (frontend).
    allow_credentials=True,                             # Permite enviar cookies en peticiones cross-site.
    allow_methods=["*"],
    allow_headers=["*"],
)

# Archivos estáticos (imágenes, recursos)
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Inicializar la conexión a Mongo al iniciar la app
@app.on_event("startup")
async def on_startup():
    await init_db()

# Incluir routers
app.include_router(users.router)
app.include_router(auth.router)

@app.get("/health")
async def health():
    """Endpoint de salud para monitorización."""
    return {"status": "ok"}
