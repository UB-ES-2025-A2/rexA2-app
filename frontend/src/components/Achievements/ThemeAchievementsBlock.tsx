import { useEffect, useMemo, useState } from "react";
import { getThemeAchievements, type AchievementProgress } from "../../services/achievements";
import { translateErrorMessage } from "../../utils/errorTranslator";
import { resolveThemeIcon, resolveAchievementIcon } from "./achievementIcons";

type Props = {
  userId?: string;
  refreshToken?: number;
};

const THEME_META: Record<string, { label: string }> = {
  naturaleza: { label: "Naturaleza" },
  gastronomia: { label: "Gastronomia" },
  "exploracion-urbana": { label: "Exploracion urbana" },
  aventura: { label: "Aventura" },
  cultura: { label: "Cultura" },
  deporte: { label: "Deporte" },
  entretenimiento: { label: "Entretenimiento" },
  otros: { label: "Otros" },
};

export default function ThemeAchievementsBlock({ userId, refreshToken }: Props) {
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setAchievements([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    const load = async () => {
      setStatus("loading");
      setError("");
      try {
        const data = await getThemeAchievements(userId);
        if (cancelled) return;
        setAchievements(data);
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los logros por temática";
        setError(translateErrorMessage(message));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken]);

  const grouped = useMemo(() => {
    const map: Record<string, AchievementProgress[]> = {};
    achievements.forEach((ach) => {
      const themeKey = (ach.theme_id ?? "otros").toLowerCase();
      if (!map[themeKey]) map[themeKey] = [];
      map[themeKey].push(ach);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => (a.threshold_value || 0) - (b.threshold_value || 0))
    );
    return map;
  }, [achievements]);

  if (!userId) return null;

  return (
    <section className="achievements-section card fill">
      <div className="panel-header compact achievements-header">
        <div>
          <p className="eyebrow">Logros</p>
          <h3>Por temática</h3>
          <p className="muted">Progreso de rutas realizadas en cada temática.</p>
        </div>
        {status === "loading" && <span className="muted">Actualizando...</span>}
      </div>

      {status === "error" && error && <div className="alert error">{error}</div>}

      <div className="achievements-grid themes-grid">
        {Object.entries(grouped).map(([themeId, list]) => {
          const meta = THEME_META[themeId] ?? { label: themeId };
          const unlocked = list.filter((ach) => ach.is_unlocked).length;
          const total = list.length;
          const ThemeIcon = resolveThemeIcon(themeId);

          return (
            <article key={themeId} className="theme-card">
              <header className="theme-card__header">
                <div className="theme-card__icon" aria-hidden>
                  <ThemeIcon />
                </div>
                <div>
                  <p className="eyebrow">{meta.label}</p>
                </div>
                <span className="pill soft theme-card__pill">
                  {unlocked}/{total} desbloqueados
                </span>
              </header>
              <div className="theme-levels">
                {list.map((ach) => {
                  const pct =
                    ach.threshold_value > 0
                      ? Math.min(100, Math.round((ach.current_value / ach.threshold_value) * 100))
                      : 0;
                  const LevelIcon = resolveAchievementIcon({
                    code: ach.code,
                    category: ach.category ?? "theme",
                    themeId: ach.theme_id ?? undefined,
                  });
                  return (
                    <div key={ach.code} className={`theme-level ${ach.is_unlocked ? "unlocked" : "locked"}`}>
                      <div className="theme-level__top">
                        <span className="theme-level__name">{ach.name}</span>
                        <span className="theme-level__count">
                          <LevelIcon /> {ach.current_value} / {ach.threshold_value}
                        </span>
                      </div>
                      <div className="theme-level__progress">
                        <div className="achievement-progress__bar dotted">
                          <div className="achievement-progress__fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
