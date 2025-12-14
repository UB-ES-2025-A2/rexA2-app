import type React from "react";
import { useState, useEffect } from "react";
import type { Category } from "../types";
import "../../styles/RoutePreviewCard.css";
import { useUnitPreference } from "../../context/UnitPreferenceContext";
import { fetchWithAuth } from "../../services/api";
import RouteMiniMap from "./RouteMiniMap";



type Props = {
  id: number | string;
  name: string;
  category: Category;
  points: Array<[number, number]>;
  images?: string[];
  image_urls?: string[];
  imageUrls?: string[];
  distanceKm?: number | null;
  durationMinutes?: number | null;
  difficulty?: string | null;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  onClick?: () => void;
  isCompleted?: boolean;
};

const RoutePreviewCard: React.FC<Props> = ({
  id,
  name,
  category,
  points,
  images = [],
  image_urls,
  imageUrls,
  distanceKm,
  durationMinutes,
  difficulty,
  ratingAverage = null,
  ratingCount = null,
  onClick,
  isCompleted = false,
}) => {
  const [remoteCover, setRemoteCover] = useState<string | null>(null);
  const { formatDistance } = useUnitPreference();
  const completed = Boolean(isCompleted);

  const formatRating = (value: number | null) =>
    value == null ? null : (Math.round(value * 10) / 10).toFixed(1);
  const normalizedRatingCount =
    typeof ratingCount === "number" && Number.isFinite(ratingCount)
      ? ratingCount
      : 0;
  const canShowRating =
    ratingAverage != null && Number.isFinite(ratingAverage) && normalizedRatingCount > 0;
  const displayAverage = formatRating(ratingAverage);
  const ratingBadge =
    canShowRating && displayAverage ? (
      <div
        className="route-preview-rating-badge"
        aria-label={`Valoración media ${displayAverage} sobre 5`}
      >
        <span className="route-preview-rating__star">★</span>
        <span className="route-preview-rating__value">{displayAverage}</span>
      </div>
    ) : null;



  const formatDuration = (minutes?: number | null) => {
    if (minutes == null) return null;
    if (minutes < 60) return `<1h`;
    const hours = Math.floor(minutes / 60);
    const remaining = Math.round(minutes % 60);
    if (remaining === 0) return `${hours}h`;
    return `${hours}h ${remaining}m`;
  };

  const difficultyLabel = difficulty
    ? {
      easy: "Fácil",
      medium: "Media",
      hard: "Alta",
    }[difficulty.toLowerCase()] ?? difficulty
    : null;

  const baseCover =
    (Array.isArray(images) && images.length > 0
      ? images[0]
      : Array.isArray(image_urls) && image_urls.length > 0
        ? image_urls[0]
        : Array.isArray(imageUrls) && imageUrls.length > 0
          ? imageUrls[0]
          : null);

  const coverImage = baseCover ?? remoteCover;

  useEffect(() => {
    let cancelled = false;
    if (baseCover) return;
    if (!id) return;

    (async () => {
      try {
        const res = await fetchWithAuth(`/routes/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        const imgs =
          (Array.isArray(data.images) && data.images.filter(Boolean)) ||
          (Array.isArray(data.image_urls) && data.image_urls.filter(Boolean)) ||
          (Array.isArray(data.imageUrls) && data.imageUrls.filter(Boolean)) ||
          [];
        const single = data.image || data.cover_image || data.thumbnail;
        const found = imgs.length > 0 ? imgs[0] : single || null;
        if (!cancelled) setRemoteCover(found);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, baseCover]);

  const formatCategory = (cat: string) => {
    if (!cat) return "Sin categoría";
    const lower = cat.toLowerCase();
    if (lower === "trabajo") return "Sin categoría";
    const labels: Record<string, string> = {
      gastronomia: "Gastronomía",
      "exploracion-urbana": "Exploración urbana",
      naturaleza: "Naturaleza",
      aventura: "Aventura",
      cultura: "Cultura",
      deporte: "Deporte",
      historia: "Historia",
      relajacion: "Relajación",
      entretenimiento: "Entretenimiento",
      otros: "Otros",
    };
    return labels[lower] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div
      className="route-preview-card"
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest(".preview-save")) return;
        onClick?.();
      }}
    >
      {completed ? (
        <div
          className="route-preview-completion done"
          aria-label="Ruta realizada"
        >
          <span className="route-preview-status-dot" aria-hidden="true" />
          <span>Realizada</span>
        </div>
      ) : null}
      <div className="route-preview-content">
        <div className="route-preview-thumb">
          {coverImage ? (
            <img src={coverImage} alt={`Imagen de ${name}`} loading="lazy" />
          ) : points.length > 0 ? (
            <RouteMiniMap points={points} className="route-preview-thumb__map" />
          ) : (
            <div className="route-preview-thumb__placeholder" aria-label="Ruta sin imagen">
              <span>🗺️</span>
            </div>
          )}
        </div>
        <div className="route-preview-texts">
          <h3 className="route-preview-title">{name}</h3>
          <p className="route-preview-category">
            Categoría: {formatCategory(category)}
          </p>
          <p className="route-preview-points">
            {points.length} punto{points.length === 1 ? "" : "s"}
          </p>

          <div className="route-preview-meta">
            {distanceKm != null ? (
              <span className="route-preview-pill" title="Distancia aproximada">
                <span className="pill-dot distance" />
                {formatDistance(distanceKm)}
              </span>
            ) : null}
            {formatDuration(durationMinutes) ? (
              <span className="route-preview-pill" title="Duración aproximada">
                <span className="pill-dot duration" />
                {formatDuration(durationMinutes)}
              </span>
            ) : null}
            {difficultyLabel ? (
              <span className="route-preview-pill" title="Dificultad estimada">
                <span className="pill-dot difficulty" />
                {difficultyLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="route-preview-actions">
          {ratingBadge}

        </div>
      </div>
    </div>
  );
};

export default RoutePreviewCard;
