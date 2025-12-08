import { fetchWithAuth } from "./api";

export type CompletedRoutesAchievement = {
  code: string;
  name: string;
  threshold_value: number;
  current_value: number;
  is_unlocked: boolean;
  icon?: string | null;
  rarity?: string | null;
};

export async function getCompletedRoutesAchievements(
  userId: string
): Promise<CompletedRoutesAchievement[]> {
  const res = await fetchWithAuth(`/api/users/${userId}/achievements/completed-routes`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudieron cargar los logros de rutas completadas");
  }

  const data = (await res.json().catch(() => null)) as CompletedRoutesAchievement[] | null;
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    code: item.code,
    name: item.name,
    threshold_value: item.threshold_value,
    current_value: item.current_value ?? 0,
    is_unlocked: Boolean(item.is_unlocked),
    icon: item.icon,
    rarity: item.rarity,
  }));
}
