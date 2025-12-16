import { getApiBaseUrl } from "./api";

export type RatingUpdatePayload = {
  type?: string;
  route_id: string;
  average: number | null;
  count: number;
};

const API_BASE = getApiBaseUrl().replace(/\/$/, "");

/**
 * Suscribe a las actualizaciones de rating vía SSE.
 * Devuelve una función para cerrar la conexión.
 */
export function subscribeToRatingUpdates(
  onUpdate: (payload: RatingUpdatePayload) => void
): () => void {
  const url = `${API_BASE}/routes/ratings/stream`;
  let closed = false;
  let es: EventSource | null = null;

  const connect = () => {
    if (closed) return;
    es = new EventSource(url);

    const handleMessage = (event: MessageEvent<string>) => {
      if (!event?.data || event.data === "keep-alive") return;
      try {
        const data = JSON.parse(event.data) as RatingUpdatePayload;
        if (data.route_id) onUpdate(data);
      } catch (err) {
        console.warn("Rating event malformado", err);
      }
    };

    es.addEventListener("rating_update", handleMessage);
    es.onmessage = handleMessage; // por si algún proxy elimina el tipo de evento

    es.onerror = () => {
      es?.close();
      if (!closed) {
        // Reconexión sencilla para mantener la suscripción viva
        setTimeout(connect, 1500);
      }
    };
  };

  connect();

  return () => {
    closed = true;
    es?.close();
  };
}
