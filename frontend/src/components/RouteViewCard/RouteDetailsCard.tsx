import React, { useState } from "react";
import "../../styles/RouteDetailsCard.css";
import type { Category } from "../types";
import { useAlert } from "../../context/AlertContext";

const API = import.meta.env.VITE_API_URL as string;

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
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const favUrl = `${API}/favorites/${routeId}`;

  const handleSaveToggle = async () => {
    if (loading) return;

    const next = !saved;
    setSaved(next);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(favUrl, {
        method: next ? "POST" : "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: token ? undefined : "include",
      });

      if (!res.ok) {
        setSaved(!next);
        const msg = await res.text().catch(() => "");
        console.error("Fav toggle failed:", res.status, msg);
        if (res.status === 401) showAlert("No autorizado. Inicia sesión.", "error");
        else if (res.status === 404) showAlert("Ruta no encontrada.", "error");
        else if (res.status === 403) showAlert("No tienes permiso para esta ruta.", "error");
        else showAlert(`No se pudo ${next ? "guardar" : "quitar"} la ruta.`, "error");
      } else {
        onSavedChange?.(next);
      }
    } catch (err) {
      setSaved(!next);
      console.error(err);
      showAlert("Error de red al cambiar favorito.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
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

        <div className="route-details-card__footer" style={{ justifyContent: "flex-end" }}>
          <label
            className="save-container"
            title={saved ? "Quitar de guardadas" : "Guardar ruta"}
          >
            <input
              type="checkbox"
              checked={saved}
              onChange={handleSaveToggle}
              disabled={loading}
              aria-label="Guardar ruta"
            />
            <svg
              viewBox="0 0 32 32"
              xmlns="http://www.w3.org/2000/svg"
              className={`save-icon ${loading ? "is-loading" : ""}`}
              role="img"
              aria-label={saved ? "Quitar de guardadas" : "Guardar ruta"}
            >
              <path d="M29.845,17.099l-2.489,8.725C26.989,27.105,25.804,28,24.473,28H11c-0.553,0-1-0.448-1-1V13  
                c0-0.215,0.069-0.425,0.198-0.597l5.392-7.24C16.188,4.414,17.05,4,17.974,4C19.643,4,21,5.357,21,7.026V12h5.002  
                c1.265,0,2.427,0.579,3.188,1.589C29.954,14.601,30.192,15.88,29.845,17.099z" />
              <path d="M7,12H3c-0.553,0-1,0.448-1,1v14c0,0.552,0.447,1,1,1h4c0.553,0,1-0.448,1-1V13C8,12.448,7.553,12,7,12z   
                M5,25.5c-0.828,0-1.5-0.672-1.5-1.5c0-0.828,0.672-1.5,1.5-1.5c0.828,0,1.5,0.672,1.5,1.5C6.5,24.828,5.828,25.5,5,25.5z" />
            </svg>
          </label>
        </div>
      </section>
    </div>
  );
};

export default RouteDetailsCard;
