"""
Script puntual para recalcular country_code / country_name en rutas existentes.

Uso:
    python -m backend.scripts.recompute_countries
Requiere tener configurada la conexión MongoDB vía variables de entorno (MONGODB_URI, DATABASE_NAME).
"""

import asyncio
from pathlib import Path

from dotenv import load_dotenv

# Carga variables desde .env de la raíz del proyecto antes de importar settings
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
if ROOT_ENV.exists():
    load_dotenv(ROOT_ENV)

from backend.db.client import init_db, get_db, close_db  # noqa: E402
from backend.db.models.route import _guess_country_from_points  # noqa: E402


async def recompute():
    await init_db()
    try:
        coll = get_db()["routes"]
    except Exception as exc:
        raise RuntimeError("DB no inicializada: revisa MONGODB_URI/DATABASE_NAME") from exc

    total = 0
    updated = 0
    skipped_no_points = 0
    guessed_none = 0

    async for doc in coll.find({}):
        total += 1
        points = doc.get("points") or []
        if not points:
            skipped_no_points += 1
            continue

        code, name = _guess_country_from_points(points)
        if code is None and name is None:
            guessed_none += 1
            continue

        prev_code = doc.get("country_code")
        prev_name = doc.get("country_name") or doc.get("country")

        if prev_code == code and prev_name == name:
            continue

        res = await coll.update_one(
            {"_id": doc["_id"]},
            {"$set": {"country_code": code, "country_name": name}},
        )
        if res.modified_count:
            updated += 1

    print(f"Procesadas: {total}")
    print(f"Actualizadas: {updated}")
    print(f"Sin puntos: {skipped_no_points}")
    print(f"Sin país detectado: {guessed_none}")


async def main():
    await recompute()
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
