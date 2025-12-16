import { fetchWithAuth } from "./api";

export type AchievementProgress = {
  code: string;
  name: string;
  threshold_value: number;
  current_value: number;
  is_unlocked: boolean;
  icon?: string | null;
  rarity?: string | null;
  theme_id?: string | null;
  category?: string | null;
};

export async function getCompletedRoutesAchievements(
  userId: string
): Promise<AchievementProgress[]> {
  const res = await fetchWithAuth(`/api/users/${userId}/achievements/completed-routes`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudieron cargar los logros de rutas completadas");
  }

  const data = (await res.json().catch(() => null)) as AchievementProgress[] | null;
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    code: item.code,
    name: item.name,
    threshold_value: item.threshold_value,
    current_value: item.current_value ?? 0,
    is_unlocked: Boolean(item.is_unlocked),
    icon: item.icon,
    rarity: item.rarity,
    theme_id: item.theme_id,
    category: item.category,
  }));
}

export async function getCreatedRoutesAchievements(
  userId: string
): Promise<AchievementProgress[]> {
  const res = await fetchWithAuth(`/api/users/${userId}/achievements/created-routes`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudieron cargar los logros de rutas creadas");
  }

  const data = (await res.json().catch(() => null)) as AchievementProgress[] | null;
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    code: item.code,
    name: item.name,
    threshold_value: item.threshold_value,
    current_value: item.current_value ?? 0,
    is_unlocked: Boolean(item.is_unlocked),
    icon: item.icon,
    rarity: item.rarity,
    theme_id: item.theme_id,
    category: item.category,
  }));
}

export async function getThemeAchievements(userId: string): Promise<AchievementProgress[]> {
  const res = await fetchWithAuth(`/api/users/${userId}/achievements/themes`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudieron cargar los logros por temática");
  }

  const data = (await res.json().catch(() => null)) as AchievementProgress[] | null;
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    code: item.code,
    name: item.name,
    threshold_value: item.threshold_value,
    current_value: item.current_value ?? 0,
    is_unlocked: Boolean(item.is_unlocked),
    icon: item.icon,
    rarity: item.rarity,
    theme_id: item.theme_id,
    category: item.category,
  }));
}

export async function getDistanceAchievements(userId: string): Promise<AchievementProgress[]> {
  const res = await fetchWithAuth(`/api/users/${userId}/achievements/distance`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(detail || "No se pudieron cargar los logros por distancia");
  }

  const data = (await res.json().catch(() => null)) as AchievementProgress[] | null;
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    code: item.code,
    name: item.name,
    threshold_value: item.threshold_value,
    current_value: item.current_value ?? 0,
    is_unlocked: Boolean(item.is_unlocked),
    icon: item.icon,
    rarity: item.rarity,
    theme_id: item.theme_id,
  }));
}
