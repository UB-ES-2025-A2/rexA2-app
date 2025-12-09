import asyncio
import json
from typing import Any, Set


class RatingEventBus:
    """
    Cola en memoria muy ligera para propagar eventos de rating a clientes conectados.
    No persiste mensajes; solo sirve para notificar en tiempo real.
    """

    def __init__(self) -> None:
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=50)
        async with self._lock:
            self._subscribers.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        async with self._lock:
            self._subscribers.discard(queue)

    async def publish(self, payload: dict[str, Any]) -> None:
        """
        Encola el mensaje en todos los suscriptores sin bloquear.
        Si alguna cola está llena, descartamos el mensaje para ese cliente.
        """
        dead_queues: list[asyncio.Queue] = []
        async with self._lock:
            for queue in self._subscribers:
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    # Descartamos la cola saturada y la eliminamos para evitar fugas
                    dead_queues.append(queue)
            for dq in dead_queues:
                self._subscribers.discard(dq)


rating_event_bus = RatingEventBus()


def rating_event_payload(route_id: str, average: float | None, count: int) -> dict[str, Any]:
    return {
        "type": "rating_update",
        "route_id": str(route_id),
        "average": average,
        "count": int(count),
    }
