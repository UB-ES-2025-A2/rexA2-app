import type React from "react";
import {useState } from "react";
import type { Category } from "../types";
import "../../styles/RoutePreviewCard.css";
import { useAlert } from "../../context/AlertContext";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL as string || window.location.origin;

type Props = {
  id: number | string;
  name: string;
  category: Category;
  points: Array<[number, number]>;
  onClick?: () => void;
  initialSaved?: boolean;
  favoriteUrl?: string;
  unfavoriteUrl?: string;
  onSavedChange?: (saved: boolean) => void;
};

const RoutePreviewCard: React.FC<Props> = ({
  id,
  name,
  category,
  points,
  onClick,
  initialSaved = false,
  favoriteUrl,
  unfavoriteUrl,
  onSavedChange,
}) => {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  const { token } = useAuth();

  const favUrl = favoriteUrl ?? `${API}/favorites/${id}`;
  const unfavUrl = unfavoriteUrl ?? favUrl;

  const handleSaveToggle = async () => {
    if (loading) return;


    if (!token) {
      showAlert("Inicia sesión para guardar rutas.", "error");
      return;
    }

    const next = !saved;
    setSaved(next);
    setLoading(true);

    try {
      const res = await fetch(next ? favUrl : unfavUrl, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setSaved(!next); // rollback
        const txt = await res.text().catch(() => "");
        console.error("Fav toggle failed:", res.status, txt);
        if (res.status === 401) showAlert("No autorizado. Inicia sesión.", "error");
        else if (res.status === 404) showAlert("Ruta no encontrada.", "error");
        else if (res.status === 403) showAlert("No tienes permiso para esta ruta.", "error");
        else showAlert(`No se pudo ${next ? "guardar" : "quitar"} la ruta.`, "error");
      } else {
        onSavedChange?.(next);
      }
    } catch {
      setSaved(!next);
      showAlert("Error de red al cambiar favorito.", "error");
    } finally {
      setLoading(false);
    }
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
      <div className="route-preview-content">
        <div className="route-preview-texts">
          <h3 className="route-preview-title">{name}</h3>
          <p className="route-preview-category">Categoría: {category}</p>
          <p className="route-preview-points">
            {points.length} punto{points.length === 1 ? "" : "s"}
          </p>
        </div>

        <label
          className="save-container preview-save"
          title={saved ? "Quitar de guardadas" : "Guardar ruta"}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => {
              e.stopPropagation();
              handleSaveToggle();
            }}
            disabled={loading}
            aria-label="Guardar ruta"
          />
          <svg
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className={`save-icon ${loading ? "is-loading" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
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
    </div>
  );
};

export default RoutePreviewCard;
