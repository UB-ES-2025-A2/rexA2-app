from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles

from backend.core.config import settings
from backend.db.client import init_db
from backend.routers import users, auth, routes

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
app.include_router(auth.router)
app.include_router(routes.router)

# === Endpoint de salud ===
@app.get("/health")
async def health():
    return {"status": "ok"}
