from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .core.config import settings
from .db.client import init_db
from .db.models import achievement as achievement_crud
from .routers import users, auth, routes, users_profile, favorite, follow, achievements

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Archivos estáticos ===
# app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    await init_db()
    await achievement_crud.ensure_all_achievements_seed()

app.include_router(users.router)
app.include_router(users_profile.router)
app.include_router(auth.router)
app.include_router(routes.router)
app.include_router(favorite.router)
app.include_router(follow.router)
app.include_router(achievements.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
# ---------- Frontend React ----------

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "static"

if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
