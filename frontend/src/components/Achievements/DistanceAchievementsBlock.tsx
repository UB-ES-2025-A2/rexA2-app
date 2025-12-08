import { useEffect, useMemo, useState } from "react";
import { getDistanceAchievements, type AchievementProgress } from "../../services/achievements";
import { translateErrorMessage } from "../../utils/errorTranslator";

type Props = {
  userId?: string;
  refreshToken?: number;
};

export default function DistanceAchievementsBlock({ userId, refreshToken }: Props) {
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
        const data = await getDistanceAchievements(userId);
        if (cancelled) return;
        setAchievements(data);
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        const message = err instanceof Error ? err.message : "No se pudieron cargar los logros de distancia";
        setError(translateErrorMessage(message));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken]);

  const { totalKm, nextThreshold } = useMemo(() => {
    const total = achievements.reduce((acc, ach) => Math.max(acc, Number(ach.current_value ?? 0)), 0);
    const remaining = achievements
      .map((ach) => ach.threshold_value)
      .filter((t) => t > total)
      .sort((a, b) => a - b);
    return { totalKm: total, nextThreshold: remaining[0] ?? Math.max(...achievements.map((a) => a.threshold_value), 0) };
  }, [achievements]);

  if (!userId) return null;

  return (
    <section className="achievements-section card fill">
      <div className="panel-header compact achievements-header">
        <div>
          <p className="eyebrow">Logros</p>
          <h3>Distancia recorrida</h3>
          <p className="muted">Suma kilómetros completando rutas.</p>
        </div>
        {status === "loading" && <span className="muted">Actualizando...</span>}
      </div>

      {status === "error" && error && <div className="alert error">{error}</div>}

      <div className="distance-progress">
        <div className="distance-progress__label">
          <span>Total</span>
          <strong>
            {totalKm} / {nextThreshold} km
          </strong>
        </div>
        <div className="achievement-progress__bar distance-progress__bar">
          <div
            className="achievement-progress__fill"
            style={{ width: `${Math.min(100, (totalKm / Math.max(nextThreshold || 1, 1)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="distance-levels">
        {achievements.map((ach) => {
          const locked = !ach.is_unlocked;
          const pct =
            ach.threshold_value > 0
              ? Math.min(100, Math.round((Number(ach.current_value ?? 0) / ach.threshold_value) * 100))
              : 0;
          return (
            <div key={ach.code} className={`distance-level ${locked ? "locked" : "unlocked"}`}>
              <div className="distance-level__header">
                <h4>{ach.name}</h4>
                <span className="muted">{ach.threshold_value} km</span>
              </div>
              <div className="distance-level__progress">
                <span className="distance-level__value">
                  {ach.current_value ?? 0} / {ach.threshold_value} km
                </span>
                <div className="achievement-progress__bar">
                  <div className="achievement-progress__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
