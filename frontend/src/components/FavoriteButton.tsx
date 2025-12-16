import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../services/api';

type Props = {
  routeId: string;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
};

const FavoriteButton: React.FC<Props> = ({ routeId, initialSaved = false, onSavedChange }) => {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const { showAlert } = useAlert();
  const { token } = useAuth();


  // fetchWithAuth internally handles the base URL (including the fix for "undefined" string)
  // so we don't need to manually construct API base here.


  // Verificar estado de favorito al montar o cambiar routeId/token
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!token || !routeId) {
        setSaved(initialSaved);

        return;
      }


      try {
        const res = await fetchWithAuth(`/users/me/routes/favorites`);

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

      }
    };

    checkFavoriteStatus();
  }, [routeId, token, initialSaved]);

  const handleSaveToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent default isn't needed for checkbox onChange, but stopPropagation is good
    e.stopPropagation();

    if (loading) return;

    if (!routeId) {
      showAlert("No se puede guardar: id de ruta desconocido.", "error");
      return;
    }
    if (!token) {
      showAlert("Inicia sesión para guardar rutas.", "error");
      // Revert checkbox state visually if not logged in
      setSaved(saved);
      return;
    }

    const next = !saved;
    setSaved(next);
    setLoading(true);

    try {
      const res = await fetchWithAuth(`/favorites/${routeId}`, {
        method: next ? "POST" : "DELETE",
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

  const handleContainerClick = (e: React.MouseEvent) => {
    // Evitar que el click en el contenedor se propague, por si el botón está dentro de otro elemento clickable
    e.stopPropagation();
  };

  // Removed blocking check to allow immediate interaction + initial state display
  // if (checking) { ... }

  return (
    <StyledWrapper onClick={handleContainerClick}>
      <div className="con-like">
        <input
          className="like"
          type="checkbox"
          checked={saved}
          onChange={handleSaveToggle}
          title={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
        />
        <div className="checkmark">
          <svg xmlns="http://www.w3.org/2000/svg" className="outline" viewBox="0 0 24 24">
            <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" className="filled" viewBox="0 0 24 24">
            <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" height={100} width={100} className="celebrate">
            <polygon className="poly" points="10,10 20,20" />
            <polygon className="poly" points="10,50 20,50" />
            <polygon className="poly" points="20,80 30,70" />
            <polygon className="poly" points="90,10 80,20" />
            <polygon className="poly" points="90,50 80,50" />
            <polygon className="poly" points="80,80 70,70" />
          </svg>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .con-like {
    /* Using the app's primary purple */
    --purple: #6366f1;
    position: relative;
    width: 50px;
    height: 50px;
  }

  .con-like .like {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    z-index: 20;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    border: none;
    background: transparent;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }

  .con-like .checkmark {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .con-like .outline,
  .con-like .filled {
    fill: var(--purple);
    position: absolute;
    width: 24px;
    height: 24px;
  }

  .con-like .filled {
    animation: kfr-filled 0.5s;
    display: none;
  }

  .con-like .celebrate {
    position: absolute;
    animation: kfr-celebrate 0.5s;
    animation-fill-mode: forwards;
    display: none;
  }

  .con-like .poly {
    stroke: var(--purple);
    fill: var(--purple);
  }

  .con-like .like:checked ~ .checkmark .filled {
    display: block
  }

  .con-like .like:checked ~ .checkmark .celebrate {
    display: block
  }

  @keyframes kfr-filled {
    0% {
      opacity: 0;
      transform: scale(0);
    }

    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  @keyframes kfr-celebrate {
    0% {
      transform: scale(0);
    }

    50% {
      opacity: 0.8;
    }

    100% {
      transform: scale(1.2);
      opacity: 0;
      display: none;
    }
  }
`;

export default FavoriteButton;