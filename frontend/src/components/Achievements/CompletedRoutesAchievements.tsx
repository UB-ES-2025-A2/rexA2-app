import { useEffect, useMemo, useState } from "react";
import { getCompletedRoutesAchievements, type AchievementProgress } from "../../services/achievements";
import { translateErrorMessage } from "../../utils/errorTranslator";
import { resolveAchievementIcon } from "./achievementIcons";

type Props = {
  userId?: string;
  refreshToken?: number;
};

export default function CompletedRoutesAchievements({ userId, refreshToken }: Props) {
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
        const data = await getCompletedRoutesAchievements(userId);
        if (cancelled) return;
        setAchievements(data);
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        const message =
          err instanceof Error ? err.message : "No se pudieron cargar los logros";
        setError(translateErrorMessage(message));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken]);

  const totalUnlocked = useMemo(
    () => achievements.filter((ach) => ach.is_unlocked).length,
    [achievements]
  );

  if (!userId) {
    return null;
  }

  return (
    <section className="achievements-section card fill">
      <div className="panel-header compact achievements-header">
        <div>
          <p className="eyebrow">Logros</p>
          <h3>Rutas completadas</h3>
          <p className="muted">Desbloquea hitos al marcar rutas como realizadas.</p>
        </div>
        <div className="achievements-counter">
          <span className="badge-soft">
            {totalUnlocked} / {achievements.length || 0} desbloqueados
          </span>
          {status === "loading" && <span className="muted">Actualizando...</span>}
        </div>
      </div>

      {status === "error" && error && <div className="alert error">{error}</div>}

      <div className="achievements-grid">
        {achievements.map((ach) => {
          const progressPct =
            ach.threshold_value > 0
              ? Math.min(100, Math.round((ach.current_value / ach.threshold_value) * 100))
              : 0;
          const locked = !ach.is_unlocked;
          const Icon = resolveAchievementIcon({ code: ach.code, category: ach.category ?? undefined });
          return (
            <article
              key={ach.code}
              className={`achievement-card ${locked ? "locked" : "unlocked"}`}
              aria-label={ach.name}
            >
              <div className="achievement-card__icon" aria-hidden>
                <Icon />
              </div>
              <div className="achievement-card__body">
                <div className="achievement-card__title-row">
                  <h4>{ach.name}</h4>
                  <span className={`pill soft ${locked ? "pill-ghost" : ""}`}>
                    {ach.rarity || (locked ? "Bloqueado" : "Desbloqueado")}
                  </span>
                </div>
                <p className="muted">{ach.threshold_value} rutas necesarias</p>
                <div className="achievement-progress">
                  <div className="achievement-progress__label">
                    {ach.current_value} / {ach.threshold_value} rutas
                  </div>
                  <div className="achievement-progress__bar">
                    <div
                      className="achievement-progress__fill"
                      style={{ width: `${progressPct}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {status === "loading" && achievements.length === 0 && (
          <p className="muted">Cargando logros...</p>
        )}
        {status !== "loading" && achievements.length === 0 && (
          <p className="muted">Aun no hay logros disponibles.</p>
        )}
      </div>
    </section>
  );
}
