import React, { useEffect, useState, useRef } from "react";
import "../../styles/RouteDetailsCard.css";
import type { Category } from "../types";
import CommentButton from "../CommentButton";
import FavoriteButton from "../FavoriteButton";
import CommentsModal from "../CommentsModal";
import DeleteRouteModal from "./DeleteRouteModal";
import DeleteButton from "./DeleteButton";
import ShareButton from "../ShareButton";
import ShareModal from "../ShareModal";
import StarRating from "../StarRating";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { useUnitPreference } from "../../context/UnitPreferenceContext";
import { fetchWithAuth } from "../../services/api";
import { getRouteCompletionStatus, setRouteCompletionStatus } from "../../services/completion";

interface RouteDetailsCardProps {
  name: string;
  description: string;
  category: Category;
  points: Array<[number, number]>;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  difficulty?: string | null;
  isPrivate?: boolean;
  onClose: () => void;
  routeId: string;
  rating?: number | null;
  ratingCount?: number | null;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  onShowComments?: () => void;
  onDelete?: (routeId: string) => Promise<void>;
  isOwnRoute?: boolean;
  onEdit?: (routeData?: any) => void;
  onRatingChange?: (stats: { average: number | null; count: number }) => void;
  initialCompleted?: boolean;
  onCompletedChange?: (completed: boolean) => Promise<void> | void;
}

const AVERAGE_WALKING_SPEED_KMH = 4;

function calculateSegmentDistanceKm(a: [number, number], b: [number, number]) {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const toRadians = (v: number) => (v * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lng2 - lng1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);
  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const earthRadiusKm = 6371;
  return earthRadiusKm * c;
}

function calculateRouteDistanceKm(points: Array<[number, number]>): number | null {
  if (!points || points.length < 2) return null;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculateSegmentDistanceKm(points[i - 1], points[i]);
  }
  return Number.isFinite(total) ? Number(total.toFixed(2)) : null;
}

function estimateDurationMinutes(
  minutes: number | null | undefined,
  distanceKm: number | null | undefined
) {
  if (minutes != null) return minutes;
  if (!distanceKm) return null;
  return Math.round((distanceKm / AVERAGE_WALKING_SPEED_KMH) * 60);
}

function estimateDifficulty(
  difficulty: string | null | undefined,
  distanceKm: number | null | undefined,
  durationMinutes: number | null | undefined
) {
  if (difficulty) return difficulty;
  const distance = distanceKm || 0;
  const duration = durationMinutes || 0;
  if (distance > 20 || duration > 360) return "hard";
  if (distance > 10 || duration > 180) return "medium";
  if (distance === 0 && duration === 0) return null;
  return "easy";
}

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

const RouteDetailsCard: React.FC<RouteDetailsCardProps> = ({
  name,
  description,
  category,
  points,
  distanceKm,
  durationMinutes,
  difficulty,
  isPrivate = false,
  onClose,
  routeId,
  rating = null,
  ratingCount = null,
  initialSaved = false,
  onSavedChange,
  onShowComments,
  onDelete,
  isOwnRoute = false,
  onEdit,
  onRatingChange,
  initialCompleted = false,
  onCompletedChange,
}) => {
  const { token, user } = useAuth();
  const { showAlert } = useAlert();
  const { formatDistance } = useUnitPreference();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [routeOwnership, setRouteOwnership] = useState<boolean | null>(null);
  const [ratingStats, setRatingStats] = useState<{ average: number | null; count: number }>(
    () => ({
      average: rating,
      count: typeof ratingCount === "number" ? ratingCount : 0,
    })
  );
  const statsFetchedRef = useRef<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const useExternalComments = Boolean(onShowComments);
  const [completionSaving, setCompletionSaving] = useState(false);
  const normalizeCompletedFlag = (value: any, fallback = false) => {
    if (value === undefined || value === null) return fallback;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes";
    }
    return value === true || value === 1;
  };
  const extractCompletedFromRoute = (payload: any): boolean | null => {
    if (!payload) return null;
    const raw =
      payload.is_completed ??
      payload.completed ??
      payload.isCompleted ??
      payload.completed_by_user ??
      payload.completedByUser ??
      payload.done ??
      (payload as any)?.user_completed;
    if (raw === undefined || raw === null) return null;
    return normalizeCompletedFlag(raw);
  };
  const [completed, setCompleted] = useState<boolean>(
    normalizeCompletedFlag(initialCompleted)
  );

  useEffect(() => {
    const loadRoute = async () => {
      if (!routeId || !token) {
        return;
      }

      try {
        const res = await fetchWithAuth(`/routes/${routeId}`);

        if (res.ok) {
          const data = await res.json();
          setRouteData(data);
          setImageIndex(0);
          if (typeof data?.user_rating === "number") {
            setUserRating(data.user_rating);
          } else if (typeof data?.rating === "number") {
            setUserRating(data.rating);
          }
          setRatingStats({
            average:
              typeof data?.rating === "number"
                ? Math.round(Number(data.rating) * 10) / 10
                : rating,
            count:
              typeof data?.rating_count === "number"
                ? data.rating_count
                : typeof ratingCount === "number"
                  ? ratingCount
                  : 0,
          });
          const completedFromApi = extractCompletedFromRoute(data);
          if (completedFromApi !== null) {
            setCompleted(completedFromApi);
          }
        }
        // Si no está ok, dejamos los datos tal como estaban (se mostrará la prop inicial)
      } catch (err) {
        console.error("Error loading route:", err);
        showAlert("Error al cargar la ruta", "error");
      }
    };

    loadRoute();
  }, [routeId, token, showAlert]);

  useEffect(() => {
    const apiCompleted = extractCompletedFromRoute(routeData);
    if (apiCompleted !== null) {
      setCompleted(apiCompleted);
    }
  }, [routeData]);

  useEffect(() => {
    setCompleted((prev) => normalizeCompletedFlag(initialCompleted, prev));
  }, [initialCompleted]);

  useEffect(() => {
    let cancelled = false;
    const fetchCompletion = async () => {
      if (!routeId || !token) return;
      try {
        const status = await getRouteCompletionStatus(routeId);
        if (cancelled) return;
        setCompleted(status);
        await onCompletedChange?.(status);
      } catch (err) {
        console.warn("No se pudo obtener estado de completado", err);
        showAlert("No se pudo cargar el estado de la ruta.", "error");
      }
    };
    fetchCompletion();
    return () => {
      cancelled = true;
    };
  }, [routeId, token]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!routeId || !token) return;
      if (statsFetchedRef.current === routeId) return;
      try {
        const res = await fetchWithAuth(`/routes/${routeId}/rating`);
        if (!res.ok) return;
        const stats = await res.json();
        const average =
          stats?.average != null && Number.isFinite(stats.average)
            ? Math.round(Number(stats.average) * 10) / 10
            : null;
        const count = typeof stats?.count === "number" ? stats.count : 0;
        setRatingStats({ average, count });
        setRouteData((prev: any) =>
          prev ? { ...prev, rating: average, rating_count: count } : prev
        );
        onRatingChange?.({ average, count });
      } catch (err) {
        console.warn("No se pudo obtener stats de valoración", err);
      } finally {
        statsFetchedRef.current = routeId;
      }
    };
    fetchStats();
  }, [routeId, token]);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!routeId || !token) {
        setRouteOwnership(null);
        return;
      }
      try {
        const res = await fetchWithAuth(`/routes/${routeId}/ownership`);
        if (res.ok) {
          const data = await res.json();
          setRouteOwnership(Boolean(data?.is_owner));
        } else {
          setRouteOwnership(false);
        }
      } catch (err) {
        console.warn("No se pudo comprobar propiedad de la ruta", err);
        setRouteOwnership(false);
      }
    };

    checkOwnership();
  }, [routeId, token]);

  const userId = user?.id || (user as any)?._id;
  const ownerId = routeData?.owner_id ?? (routeData as any)?.ownerId;
  const isAuthor =
    isOwnRoute ||
    routeData?.is_owner ||
    routeOwnership === true ||
    (ownerId && userId && String(ownerId) === String(userId));
  const isAuthenticated = Boolean(token);
  const waitingRouteData = Boolean(isAuthenticated && !routeData);
  const waitingOwnership = Boolean(isAuthenticated && routeOwnership === null);
  const waitingPerms = waitingRouteData || waitingOwnership;
  const canRate = isAuthenticated && !waitingPerms && !isAuthor;
  const showRatingControl = Boolean(routeData) && canRate;

  const roundToOneDecimal = (value: number) =>
    (Math.round(value * 10) / 10).toFixed(1);
  const averageRating = ratingStats.average ?? routeData?.rating ?? rating ?? null;
  const averageRatingValue = Number(averageRating ?? 0);
  const ratingCountValue = Math.max(
    0,
    Number.isFinite(ratingStats.count)
      ? Number(ratingStats.count)
      : Number.isFinite(routeData?.rating_count)
        ? Number(routeData?.rating_count)
        : Number.isFinite(ratingCount)
          ? Number(ratingCount)
          : 0
  );
  const hasRatings =
    averageRating != null && Number.isFinite(averageRatingValue) && ratingCountValue > 0;
  const displayAverage = hasRatings ? roundToOneDecimal(averageRatingValue) : null;
  const ratingCountLabel =
    ratingCountValue > 0
      ? `${ratingCountValue} valoración${ratingCountValue === 1 ? "" : "es"}`
      : "Sin valoraciones";

  const ratingHint = !isAuthenticated
    ? "Inicia sesión para valorar esta ruta."
    : isAuthor
      ? "No puedes valorar tu propia ruta."
      : waitingPerms
        ? "Cargando permisos de valoración..."
        : "Haz clic en una estrella para valorar.";
  const images: string[] =
    Array.isArray(routeData?.images) && routeData.images.length
      ? routeData.images
      : [];
  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[Math.min(imageIndex, images.length - 1)] : null;

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete(routeId);
    }
  };

  const handleRatingChange = async (value: number) => {
    if (!canRate) {
      showAlert(
        !isAuthenticated
          ? "Inicia sesión para valorar."
          : isAuthor
            ? "No puedes valorar tu propia ruta."
            : "No puedes valorar esta ruta en este momento.",
        "error"
      );
      return;
    }
    if (ratingSaving) return;

    const previous = userRating;
    setUserRating(value);
    setRatingSaving(true);
    try {
      const res = await fetchWithAuth(`/routes/${routeId}/rating`, {
        method: "POST",
        body: JSON.stringify({ rating: value }),
      });

      if (!res.ok) {
        setUserRating(previous ?? null);
        const detail =
          (await res.json().catch(() => null))?.detail ||
          "No se pudo guardar la valoración.";
        showAlert(detail, "error");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (typeof data?.user_rating === "number") {
        setUserRating(data.user_rating);
      }
      if (data?.average !== undefined || data?.count !== undefined) {
        const average =
          data?.average != null && Number.isFinite(data.average)
            ? Math.round(Number(data.average) * 10) / 10
            : null;
        const count = typeof data?.count === "number" ? data.count : 0;
        setRatingStats({ average, count });
        setRouteData((prev: any) =>
          prev
            ? {
              ...prev,
              rating: average ?? prev.rating,
              rating_count: count ?? prev.rating_count,
            }
            : prev
        );
        onRatingChange?.({ average, count });
      }
      showAlert("Valoración guardada", "success");
    } catch (err) {
      console.error("Error guardando valoración:", err);
      setUserRating(previous ?? null);
      showAlert("Error al guardar la valoración.", "error");
    } finally {
      setRatingSaving(false);
    }
  };

  const handleCommentClick = () => {
    if (useExternalComments) {
      onShowComments?.();
    } else {
      setCommentsOpen(true);
    }
  };

  const handleCompletionToggle = async () => {
    if (!isAuthenticated) {
      showAlert("Inicia sesión para marcar la ruta como realizada.", "error");
      return;
    }
    if (completionSaving) return;
    const next = !completed;
    const prev = completed;
    setCompleted(next);
    setCompletionSaving(true);
    try {
      const response = await setRouteCompletionStatus(routeId, next);
      const saved = response.completed;
      setCompleted(saved);
      await onCompletedChange?.(saved);

      if (Array.isArray(response.newly_unlocked) && response.newly_unlocked.length > 0) {
        response.newly_unlocked.forEach((achievement) => {
          const prefix = achievement.icon ? `${achievement.icon} ` : "";
          let message = `${prefix}Logro desbloqueado: ${achievement.name}`;
          if (achievement.category === "distance_travelled") {
            message = `${prefix}¡Nuevo logro! Has recorrido más de ${achievement.threshold_value} km`;
          }
          showAlert(message, "success");
        });
      }

      showAlert(
        saved ? "Ruta marcada como realizada." : "Ruta marcada como pendiente.",
        "success"
      );
    } catch (err) {
      console.error("Error cambiando estado de la ruta:", err);
      setCompleted(prev);
      const detail =
        err instanceof Error ? err.message : "No se pudo actualizar el estado de la ruta.";
      showAlert(detail, "error");
    } finally {
      setCompletionSaving(false);
    }
  };

  /*const canDelete = isAuthor; */
  const canDelete = isOwnRoute || routeData?.is_owner;
  const displayDistance =
    routeData?.distance_km ??
    routeData?.distanceKm ??
    distanceKm ??
    calculateRouteDistanceKm(points);
  const displayDuration = estimateDurationMinutes(
    routeData?.duration_minutes ?? routeData?.durationMinutes ?? durationMinutes,
    displayDistance
  );
  const displayDifficulty = estimateDifficulty(
    routeData?.difficulty ?? difficulty,
    displayDistance,
    displayDuration
  );

  const formatDuration = (minutes?: number | null) => {
    if (minutes == null) return null;
    if (minutes < 60) return "<1h";
    const hours = Math.floor(minutes / 60);
    const remaining = Math.round(minutes % 60);
    if (remaining === 0) return `${hours}h`;
    return `${hours}h ${remaining}m`;
  };

  const difficultyLabel = displayDifficulty
    ? {
      easy: "Fácil",
      medium: "Media",
      hard: "Alta",
    }[displayDifficulty.toLowerCase()] ?? displayDifficulty
    : null;

  const slugifyName = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "ruta";

  const handleDownloadPdf = async () => {
    if (!routeId) return;
    if (!isAuthenticated) {
      showAlert("Inicia sesión para descargar la ruta en PDF.", "error");
      return;
    }

    setDownloadingPdf(true);
    setDownloadError(null);
    try {
      const res = await fetchWithAuth(`/routes/${routeId}/pdf`, { method: "GET" });

      if (!res.ok) {
        let detail = "No se pudo generar el PDF. Inténtalo de nuevo más tarde.";
        const body = await res.json().catch(() => null);
        if (body?.detail) detail = String(body.detail);
        if (res.status >= 500) {
          detail = "Error del servidor al generar el PDF. Inténtalo de nuevo más tarde.";
        }
        throw new Error(detail);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("El PDF generado está vacío.");
      }

      const fileName = `${slugifyName(name)}-rex.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showAlert("Descarga del PDF con éxito.", "success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo generar el PDF. Revisa tu conexión o inténtalo más tarde.";
      const networkHint =
        err instanceof TypeError
          ? "Revisa tu conexión o vuelve a intentarlo."
          : "";
      const finalMessage = networkHint ? `${message} ${networkHint}`.trim() : message;
      setDownloadError(finalMessage);
      showAlert(finalMessage, "error");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <>
      <div className="route-details-card">
        <header className="route-details-card__header">
          <h2 className="route-details-card__title">{name}</h2>
          <div className="route-details-card__header-actions">
            <button
              type="button"
              className="route-details-card__download-btn"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              aria-busy={downloadingPdf}
              aria-label="Descargar ruta en PDF"
            >
              <span className="route-details-card__download-icon" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                  <path
                    d="M14 2v5a1 1 0 0 0 1 1h4"
                    stroke="white"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.8 15.7c.6 0 1.1-.4 1.1-1.1 0-.7-.5-1.1-1.1-1.1H7.7v2.2h1.1Z"
                    fill="white"
                  />
                  <path
                    d="M7.1 12.5h1.7c1 0 1.8.8 1.8 2 0 1.2-.7 2-1.8 2H7.1v-4Zm4 .2h1.2c.8 0 1.3.4 1.3 1.2 0 .8-.5 1.2-1.3 1.2H11.8v1.4H11V12.7Zm.8.7v1.2h.4c.5 0 .8-.2.8-.6s-.3-.6-.8-.6h-.4Zm3.4-.7h1.6c1 0 1.6.6 1.6 1.5 0 .9-.6 1.5-1.6 1.5h-.8v1.2h-.8v-4.2Zm.8.7v1.4h.7c.5 0 .8-.2.8-.7s-.3-.7-.8-.7h-.7Z"
                    fill="white"
                  />
                </svg>
              </span>
              <span className="route-details-card__download-label">
                {downloadingPdf ? "Generando..." : "PDF"}
              </span>
            </button>
            {isAuthor && onEdit ? (
              <button
                className="route-details-card__edit-btn"
                onClick={() =>
                  onEdit(
                    routeData || {
                      id: routeId,
                      name,
                      description,
                      category,
                      points,
                      isPrivate,
                    }
                  )
                }
              >
                Editar ruta
              </button>
            ) : null}
            <button className="route-details-card__close" onClick={onClose}>
              ✕
            </button>
          </div>
        </header>

        <section className="route-details-card__body">
          <div className="route-details-card__media">
            {currentImage ? (
              <div className="route-details-card__image-wrapper">
                <img src={currentImage} alt={`Imagen de ${name}`} loading="lazy" />
                {images.length > 1 && (
                  <div className="route-details-card__image-controls" aria-label="Galería de imágenes">
                    <button
                      type="button"
                      onClick={() =>
                        setImageIndex((prev) => (prev - 1 + images.length) % images.length)
                      }
                      aria-label="Imagen anterior"
                    >
                      ←
                    </button>
                    <div className="route-details-card__image-dots">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={idx === imageIndex ? "active" : ""}
                          aria-label={`Ver imagen ${idx + 1}`}
                          onClick={() => setImageIndex(idx)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageIndex((prev) => (prev + 1) % images.length)}
                      aria-label="Imagen siguiente"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="route-details-card__placeholder">
                <span role="img" aria-label="Ruta sin imagen">
                  🗺️
                </span>
                <p>Esta ruta no tiene imágenes aún.</p>
              </div>
            )}
          </div>

          <p className="route-details-card__description">{description}</p>

          <div className="route-details-card__info">
            <span className="route-details-card__category">
              🏷️ Categoría: <strong>{formatCategory(category)}</strong>
            </span>
            <span className="route-details-card__privacy">
              🔒 {isPrivate ? "Privada" : "Pública"}
            </span>
            <span className="route-details-card__points">
              📍 {points.length} puntos en la ruta
            </span>
          </div>

          <div className="route-details-card__meta">
            <span className="route-details-pill">
              <span className="pill-dot distance" />
              {formatDistance(displayDistance)}
            </span>
            {formatDuration(displayDuration) ? (
              <span className="route-details-pill">
                <span className="pill-dot duration" />
                {formatDuration(displayDuration)}
              </span>
            ) : null}
            {difficultyLabel ? (
              <span className="route-details-pill">
                <span className="pill-dot difficulty" />
                {difficultyLabel}
              </span>
            ) : null}
          </div>

          <div className="route-details-card__points-list">
            <h4>Puntos de la ruta</h4>
            <ul>
              {points.map(([lng, lat], i) => (
                <li key={i}>
                  {i + 1}. <code>{lng.toFixed(4)}</code>,{" "}
                  <code>{lat.toFixed(4)}</code>
                </li>
              ))}
            </ul>
          </div>

          <div className="route-details-card__rating">
            <div className="route-details-card__rating-summary" aria-live="polite">
              <div className="route-details-card__rating-meta">
                <span className="route-details-card__rating-label">Valoración de la ruta</span>
                <span className="route-details-card__rating-count">{ratingCountLabel}</span>
              </div>
              <div className="route-details-card__rating-number">
                <span className="route-details-card__rating-average">
                  {displayAverage ?? "—"}
                </span>
                <span className="route-details-card__rating-scale">
                  /5 <span className="route-details-card__rating-star-inline" aria-hidden="true">★</span>
                </span>
              </div>
            </div>

            {showRatingControl || (!isAuthor && ratingHint) ? (
              <>
                <div className="route-details-card__rating-divider" aria-hidden="true" />
                {showRatingControl ? (
                  <>
                    <div className="route-details-card__rating-header">
                      <span className="route-details-card__rating-title">Tu valoración</span>
                      <span className="route-details-card__rating-value">
                        {userRating != null ? `${userRating}` : "Sin valorar"}
                      </span>
                    </div>
                    <StarRating
                      value={userRating ?? 0}
                      onChange={handleRatingChange}
                      disabled={!canRate || ratingSaving}
                      hint={ratingHint}
                    />
                  </>
                ) : (
                  <p className="route-details-card__rating-hint">{ratingHint}</p>
                )}
              </>
            ) : null}
          </div>

          <div className="route-details-card__status" aria-live="polite">
            <button
              type="button"
              className="route-status-toggle"
              onClick={handleCompletionToggle}
              disabled={!isAuthenticated || completionSaving}
            >
              {completionSaving
                ? "Guardando..."
                : completed
                  ? "Ruta realizada"
                  : "Marcar como realizada"}
            </button>
          </div>

          <div
            className="route-details-card__footer"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "12px" }}>
              <CommentButton onClick={handleCommentClick} />
              <FavoriteButton
                routeId={routeId}
                initialSaved={initialSaved}
                onSavedChange={onSavedChange}
              />
              <ShareButton onClick={() => setShareModalOpen(true)} />
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {canDelete && (
                <DeleteButton
                  onClick={() => setDeleteModalOpen(true)}
                />
              )}
            </div>
          </div>
          {downloadError ? (
            <p className="route-details-card__download-error" role="alert">
              {downloadError}
            </p>
          ) : null}
        </section>
      </div>

      {!useExternalComments && (
        <CommentsModal
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          routeId={routeId}
        />
      )}

      <DeleteRouteModal
        open={deleteModalOpen}
        routeName={name}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />

      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        link={`${window.location.origin}/mapa?route=${routeId}`}
      />
    </>
  );
};

export default RouteDetailsCard;
