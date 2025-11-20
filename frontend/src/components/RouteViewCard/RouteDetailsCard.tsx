import React, { useState } from "react";
import "../../styles/RouteDetailsCard.css";
import type { Category } from "../types";
import CommentButton from "../CommentButton";
import FavoriteButton from "../FavoriteButton";
import CommentsModal from "../CommentsModal";

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
}) => {
  const [commentsOpen, setCommentsOpen] = useState(false);

  const handleCommentsClick = () => {
    setCommentsOpen(true);
  };

  return (
    <>
      <div className="route-details-card">
        <header className="route-details-card__header">
          <h2 className="route-details-card__title">{name}</h2>
          <button className="route-details-card__close" onClick={onClose}>✕</button>
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
                  {i + 1}. <code>{lng.toFixed(4)}</code>, <code>{lat.toFixed(4)}</code>
                </li>
              ))}
            </ul>
          </div>

          <div className="route-details-card__footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <CommentButton onClick={handleCommentsClick} />
            <FavoriteButton 
              routeId={routeId} 
              initialSaved={initialSaved}
              onSavedChange={onSavedChange}
            />
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
