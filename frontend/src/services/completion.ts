import { fetchWithAuth } from "./api";

type CompletionResponse = { completed: boolean };

export async function getRouteCompletionStatus(routeId: string): Promise<boolean> {
  const res = await fetchWithAuth(`/routes/${routeId}/completion`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudo obtener el estado de la ruta");
  }
  const data = (await res.json().catch(() => null)) as CompletionResponse | null;
  return Boolean(data?.completed);
}

export async function setRouteCompletionStatus(
  routeId: string,
  completed: boolean
): Promise<boolean> {
  const res = await fetchWithAuth(`/routes/${routeId}/completion`, {
    method: "POST",
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudo actualizar el estado de la ruta");
  }
  const data = (await res.json().catch(() => null)) as CompletionResponse | null;
  return Boolean(data?.completed);
}

export async function getMyCompletedRouteIds(): Promise<string[]> {
  const res = await fetchWithAuth("/routes/completed/me");
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudieron cargar tus rutas completadas");
  }
  const data = (await res.json().catch(() => null)) as { route_ids?: string[] } | null;
  return Array.isArray(data?.route_ids) ? data!.route_ids.map(String) : [];
}
