from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from core.config import settings
from db.client import init_db
from routers import users, auth, routes, users_profile, favorite

# === Instancia principal ===
app = FastAPI(title=settings.PROJECT_NAME)

# === Middleware CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Archivos estáticos ===
# app.mount("/static", StaticFiles(directory="static"), name="static")

# === Inicializar la conexión a MongoDB ===
@app.on_event("startup")
async def startup_event():
    await init_db()

# === Routers ===
app.include_router(users.router)
app.include_router(users_profile.router)
app.include_router(auth.router)
app.include_router(routes.router)
app.include_router(favorite.router)

# === Endpoint de salud ===
@app.get("/health")
async def health():
    return {"status": "ok"}
# ---------- Frontend React ----------

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "static"   # aquí copiamos el build en el workflow

if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )