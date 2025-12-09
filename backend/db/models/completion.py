from datetime import datetime, timezone
import backend.db.client as db_client

COLL = "user_routes_completed"


async def mark_completed(user_id: str, route_id: str) -> None:
  """
  Marca una ruta como completada para un usuario (idempotente).
  """
  await db_client.db[COLL].update_one(
    {"user_id": str(user_id), "route_id": str(route_id)},
    {
      "$set": {
        "user_id": str(user_id),
        "route_id": str(route_id),
        "completed_at": datetime.now(timezone.utc),
      }
    },
    upsert=True,
  )


async def unmark_completed(user_id: str, route_id: str) -> None:
  """
  Elimina el estado de ruta completada para un usuario (idempotente).
  """
  await db_client.db[COLL].delete_one({"user_id": str(user_id), "route_id": str(route_id)})


async def is_completed(user_id: str, route_id: str) -> bool:
  """
  Devuelve True si la ruta está marcada como completada por el usuario.
  """
  doc = await db_client.db[COLL].find_one(
    {"user_id": str(user_id), "route_id": str(route_id)},
    {"_id": 1},
  )
  return doc is not None


async def list_completed(user_id: str) -> list[str]:
  """
  Devuelve el listado de IDs de rutas completadas por el usuario.
  """
  cursor = db_client.db[COLL].find({"user_id": str(user_id)}, {"route_id": 1})
  routes: list[str] = []
  async for doc in cursor:
    rid = doc.get("route_id")
    if rid:
      routes.append(str(rid))
  return routes
