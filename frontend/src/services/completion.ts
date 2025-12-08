import { fetchWithAuth } from "./api";

export type AchievementUnlock = {
  code: string;
  name: string;
  description?: string;
  category?: string;
  threshold_value: number;
  current_value?: number;
  icon?: string | null;
  rarity?: string | null;
};

export type CompletionResponse = { completed: boolean; newly_unlocked?: AchievementUnlock[] };

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
): Promise<CompletionResponse> {
  const res = await fetchWithAuth(`/routes/${routeId}/completion`, {
    method: "POST",
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudo actualizar el estado de la ruta");
  }
  const data = (await res.json().catch(() => null)) as CompletionResponse | null;
  return {
    completed: Boolean(data?.completed),
    newly_unlocked: Array.isArray(data?.newly_unlocked) ? data?.newly_unlocked : [],
  };
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
