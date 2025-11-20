import React, { useEffect, useState } from "react";
import RoutePreviewCard from "../RoutePreviewCard/RoutePreviewCard";
import type { Category } from "../types";
import { useAlert } from "../../context/AlertContext";
import "../../styles/UserViewCard.css";

const API = import.meta.env.VITE_API_URL || window.location.origin;

type RouteItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  points: Array<[number, number]>;
  visibility: boolean;
};

type Props = {
  username: string;
  email: string;
  avatarUrl?: string | null;

  onClose: () => void;
  onRouteClick?: (route: RouteItem) => void;
};

const UserViewCard: React.FC<Props> = ({
  username,
  email,
  avatarUrl,
  onClose,
  onRouteClick,
}) => {
  const { showAlert } = useAlert();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;

    const fetchRoutes = async () => {
      setLoading(true);
      setRoutes([]);

      try {
        const res = await fetch(
          `${API}/routes/user/${encodeURIComponent(username)}`
        );
        if (!res.ok) {
          throw new Error("Error cargando rutas del usuario");
        }

        const data = await res.json();
        if (cancelled) return;

        const formatted: RouteItem[] = data.map((route: any) => ({
          id: route.id,
          name: route.name,
          description: route.description || "Sin descripción",
          category: route.category || "sin categoría",
          points: Array.isArray(route.points)
            ? route.points.map((p: any) => [p.longitude, p.latitude])
            : [],
          visibility: route.visibility ?? false,
        }));

        setRoutes(formatted);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : "No se han podido cargar las rutas del usuario";
        showAlert(msg, "error");
        
        setRoutes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRoutes();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return (
    <div className="usercard">
      <button
        className="usercard__close"
        type="button"
        onClick={onClose}
        aria-label="Cerrar perfil de usuario"
      >
        ✕
      </button>

      <div className="usercard__header">
        {avatarUrl && (
          <div className="usercard__avatar-wrapper">
            <img src={avatarUrl} alt={`Avatar de ${username}`} />
          </div>
        )}

        <h2 className="usercard__username">{username}</h2>
        <p className="usercard__email">{email}</p>
      </div>

      <h3 className="usercard__routes-title">
        Rutas del usuario '{username}'
      </h3>

      <div className="usercard__routes">
        {loading ? (
          <p className="muted">Cargando rutas… </p>
        ) : routes.length === 0 ? (
          <p className="muted">Este usuario aún no tiene rutas.</p>
        ) : (
          routes.map((r) => (
            <RoutePreviewCard
              key={r.id}
              id={r.id}
              name={r.name}
              category={r.category as Category}
              points={r.points}
              initialSaved={false}
              onClick={() => onRouteClick?.(r)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default UserViewCard;
