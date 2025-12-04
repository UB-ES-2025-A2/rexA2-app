import React, { useEffect, useState } from "react";
import "../../styles/RouteDetailsCard.css";
import type { Category } from "../types";
import CommentButton from "../CommentButton";
import FavoriteButton from "../FavoriteButton";
import CommentsModal from "../CommentsModal";
import DeleteRouteModal from "./DeleteRouteModal";
import DeleteButton from "./DeleteButton";
import StarRating from "../StarRating";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { fetchWithAuth } from "../../services/api";

interface RouteDetailsCardProps {
  name: string;
  description: string;
  category: Category;
  points: Array<[number, number]>;
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
}

const RouteDetailsCard: React.FC<RouteDetailsCardProps> = ({
  name,
  description,
  category,
  points,
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
}) => {
  const { token, user } = useAuth();
  const { showAlert } = useAlert();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [routeOwnership, setRouteOwnership] = useState<boolean | null>(null);
  const useExternalComments = Boolean(onShowComments);

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
          if (typeof data?.user_rating === "number") {
            setUserRating(data.user_rating);
          } else if (typeof data?.rating === "number") {
            setUserRating(data.rating);
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
          setRouteOwnership(null);
        }
      } catch (err) {
        console.warn("No se pudo comprobar propiedad de la ruta", err);
        setRouteOwnership(null);
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
  const averageRating = routeData?.rating ?? rating ?? null;
  const averageRatingValue = Number(averageRating);
  const ratingCountValue = Math.max(
    0,
    Number.isFinite(routeData?.rating_count)
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
        setRouteData((prev: any) =>
          prev
            ? {
                ...prev,
                rating: data?.average ?? prev.rating,
                rating_count: data?.count ?? prev.rating_count,
              }
            : prev
        );
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

  const canDelete = isOwnRoute || routeData?.is_owner;

  return (
    <>
      <div className="route-details-card">
        <header className="route-details-card__header">
          <h2 className="route-details-card__title">{name}</h2>
          <button className="route-details-card__close" onClick={onClose}>
            ✕
          </button>
        </header>

        <section className="route-details-card__body">
          <p className="route-details-card__description">{description}</p>

          <div className="route-details-card__info">
            <span className="route-details-card__category">
              🏷️ Categoría: <strong>{category}</strong>
            </span>
            <span className="route-details-card__privacy">
              🔒 {isPrivate ? "Privada" : "Pública"}
            </span>
            <span className="route-details-card__points">
              📍 {points.length} puntos en la ruta
            </span>
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
            </div>
            {canDelete && (
              <DeleteButton
                onClick={() => setDeleteModalOpen(true)}
              />
            )}
          </div>
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
    </>
  );
};

export default RouteDetailsCard;
