import React, { useState, useEffect } from 'react';
import '../styles/Comments.css';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

type Props = {
  routeId: string;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
};

const FavoriteButton: React.FC<Props> = ({ routeId, initialSaved = false, onSavedChange }) => {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { showAlert } = useAlert();
  const { token } = useAuth();
  const API = import.meta.env.VITE_API_URL as string;

  const favUrl = `${API}/favorites/${routeId}`;

  // Verificar estado de favorito al montar o cambiar routeId/token
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!token || !routeId) {
        setSaved(initialSaved);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        const res = await fetch(`${API}/users/me/routes/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const favRoutes = await res.json();
          const isFav = favRoutes.some((route: any) => 
            route.id === routeId || route._id === routeId
          );
          setSaved(isFav);
        } else {
          setSaved(initialSaved);
        }
      } catch (err) {
        console.error("Error checking favorite:", err);
        setSaved(initialSaved);
      } finally {
        setChecking(false);
      }
    };

    checkFavoriteStatus();
  }, [routeId, token, initialSaved, API]);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading || checking) return;

    if (!routeId) {
      showAlert("No se puede guardar: id de ruta desconocido.", "error");
      return;
    }
    if (!token) {
      showAlert("Inicia sesión para guardar rutas.", "error");
      return;
    }

    const next = !saved;
    setSaved(next);
    setLoading(true);

    try {
      const res = await fetch(favUrl, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

  const colors = saved 
    ? { i: '#FF9966', j: '#FF5E62' }
    : { i: '#667eea', j: '#764ba2' };

  return (
    <div className="favorite-button-wrapper">
      <ul>
        <li 
          style={{ 
            '--i': colors.i, 
            '--j': colors.j,
            opacity: checking ? 0.6 : 1,
            pointerEvents: checking ? 'none' : 'auto'
          } as React.CSSProperties}
          onClick={handleSaveToggle}
          title={saved ? "Quitar de guardadas" : "Guardar ruta"}
        >
          <span className="favorite-icon">{'❤️'}</span>
          <span className="favorite-title">{checking ? 'Checking' : (saved ? "Saved" : "Favourite")}</span>
        </li>
      </ul>
    </div>
  );
}

export default FavoriteButton;