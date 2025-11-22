import React, { useState, useEffect } from "react";
import "../../styles/RouteDetailsCard.css";
import type { Category } from "../types";
import CommentButton from "../CommentButton";
import FavoriteButton from "../FavoriteButton";
import CommentsModal from "../CommentsModal";
import { useAuth } from "../../context/AuthContext";
import { fetchWithAuth } from "../../services/api";

interface RouteDetailsCardProps {
  name: string;
  description: string;
  category: Category;
  points: Array<[number, number]>;
  isPrivate?: boolean;
  onClose: () => void;
  routeId: string;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
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
  initialSaved = false,
  onSavedChange,
  isOwnRoute = false,
}) => {
  const { token } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoute = async () => {
      if (!token || !routeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetchWithAuth(`/routes/${routeId}`);
        
        if (res.ok) {
          const data = await res.json();
          setRouteData(data);
        }
      } catch (err) {
        console.error("Error loading route:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRoute();
  }, [routeId, token]);

  const handleDeleteClick = async () => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta ruta?")) {
      setIsDeleting(true);
      try {
        const res = await fetchWithAuth(`/routes/${routeId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: No se pudo eliminar`);
        }
        
        onClose();
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert(error instanceof Error ? error.message : "Error al eliminar la ruta");
      } finally {
        setIsDeleting(false);
      }
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
              <CommentButton onClick={() => setCommentsOpen(true)} />
              <FavoriteButton
                routeId={routeId}
                initialSaved={initialSaved}
                onSavedChange={onSavedChange}
              />
            </div>
            {canDelete && (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="route-details-card__delete-btn"
                title="Eliminar ruta"
              >
                {isDeleting ? "Eliminando..." : "🗑️ Eliminar"}
              </button>
            )}
          </div>
        </section>
      </div>

      <CommentsModal
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        routeId={routeId}
      />
    </>
  );
};

export default RouteDetailsCard;
