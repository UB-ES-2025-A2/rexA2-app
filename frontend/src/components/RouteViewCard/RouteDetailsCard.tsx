import React, { useState, useEffect } from "react";
import "../../styles/RouteDetailsCard.css";
import type { Category } from "../types";
import CommentButton from "../CommentButton";
import FavoriteButton from "../FavoriteButton";
import CommentsModal from "../CommentsModal";
import DeleteRouteModal from "./DeleteRouteModal";
import DeleteButton from "./DeleteButton";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { fetchWithAuth } from "../../services/api";

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
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  onShowComments?: () => void;
  onDelete?: (routeId: string) => Promise<void>;
  isOwnRoute?: boolean;
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
  initialSaved = false,
  onSavedChange,
  onShowComments,
  onDelete,
  isOwnRoute = false,
}) => {
  const { token } = useAuth();
  const { showAlert } = useAlert();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const useExternalComments = Boolean(onShowComments);

  useEffect(() => {
    const loadRoute = async () => {
      if (!token || !routeId) {
        return;
      }

      try {
        const res = await fetchWithAuth(`/routes/${routeId}`);

        if (res.ok) {
          const data = await res.json();
          setRouteData(data);
        }
      } catch (err) {
        console.error("Error loading route:", err);
        showAlert("Error al cargar la ruta", "error");
      }
    };

    loadRoute();
  }, [routeId, token, showAlert]);

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete(routeId);
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

          <div className="route-details-card__meta">
            {typeof displayDistance === "number" ? (
              <span className="route-details-pill">
                <span className="pill-dot distance" />
                {displayDistance} km
              </span>
            ) : null}
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
