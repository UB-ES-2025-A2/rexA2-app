import React, { useEffect, useState, useCallback } from "react";
import RoutePreviewCard from "../RoutePreviewCard/RoutePreviewCard";
import type { Category } from "../types";
import { useAlert } from "../../context/AlertContext";
import { useAuth } from "../../context/AuthContext";
import "../../styles/UserViewCard.css";

const API = import.meta.env.VITE_API_URL || window.location.origin;

type RouteItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  points: Array<[number, number]>;
  visibility: boolean;
  rating?: number | null;
  rating_count?: number | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  difficulty?: string | null;
  images?: string[];
};

type Props = {
  userId: string; // id del usuario cuyo perfil se muestra
  username: string;
  email: string;
  avatarUrl?: string | null;

  onClose: () => void;
  onRouteClick?: (route: RouteItem) => void;
};

const UserViewCard: React.FC<Props> = ({
  userId,
  username,
  email,
  avatarUrl,
  onClose,
  onRouteClick,
}) => {
  const { showAlert } = useAlert();
  const { user, token } = useAuth();

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Normalizamos id del usuario autenticado (por si en algún momento viene)
  const authUserId = user && ((user as any).id ?? (user as any)._id ?? null);

  // Comparación por id (si existiera) y por username (que sí tenemos)
  const sameId =
    !!authUserId && !!userId && String(authUserId) === String(userId);

  const sameUsername =
    !!user?.username && !!username && user.username === username;

  const isOwnProfile = !!user && (sameId || sameUsername);
  const shouldShowFollowButton = !isOwnProfile;

  console.log("[UserViewCard] render", {
    authUser: user,
    authUserId,
    profileUserId: userId,
    authUsername: user?.username,
    profileUsername: username,
    sameId,
    sameUsername,
    isOwnProfile,
    shouldShowFollowButton,
    isFollowingState: isFollowing,
  });

  // Función centralizada para obtener el estado real de seguimiento desde backend
  const refreshFollowState = useCallback(async () => {
    console.log("[FOLLOW-STATE] refresh start", {
      token,
      userId,
      isOwnProfile,
    });

    if (!token || !userId) {
      console.log("[FOLLOW-STATE] skip refresh: no token o sin userId", {
        token,
        userId,
      });
      return;
    }

    if (isOwnProfile) {
      console.log("[FOLLOW-STATE] skip refresh: own profile");
      setIsFollowing(false);
      return;
    }

    console.log("[FOLLOW-STATE] fetching /is-following", { userId });

    try {
      const res = await fetch(
        `${API}/users/${encodeURIComponent(userId)}/is-following`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      console.log("[FOLLOW-STATE] response", {
        status: res.status,
        ok: res.ok,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        console.warn("[FOLLOW-STATE] not ok response, body:", txt);
        return;
      }

      const data = await res.json();
      console.log("[FOLLOW-STATE] raw data", data);

      const raw = (data as any).is_following;
      const next = raw === true || raw === "true" || raw === 1 || raw === "1";

      console.log("[FOLLOW-STATE] parsed value", {
        raw,
        parsed: next,
      });

      setIsFollowing(next);
    } catch (err) {
      console.warn("[FOLLOW-STATE] error", err);
    }
  }, [token, userId, isOwnProfile]);

  // Al montar el componente o cambiar de usuario, sincronizar con backend
  useEffect(() => {
    console.log("[FOLLOW-STATE] effect triggered", {
      userId,
      token,
      isOwnProfile,
    });

    // reseteamos antes de pedir al backend para evitar arrastrar estados antiguos
    setIsFollowing(false);
    refreshFollowState();
  }, [refreshFollowState, userId, token, isOwnProfile]);

  const handleFollowClick = async () => {
    console.log("[FOLLOW] click", {
      authUser: user,
      authUserId,
      profileUserId: userId,
      token,
      isOwnProfile,
      isFollowingBefore: isFollowing,
    });

    if (isOwnProfile) {
      showAlert("No puedes seguirte a ti mismo", "error");
      return;
    }

    if (!userId) {
      showAlert("Usuario destino no válido (sin id)", "error");
      return;
    }

    if (!token) {
      showAlert("Debes iniciar sesión para seguir usuarios", "error");
      return;
    }

    setFollowLoading(true);
    console.log("[FOLLOW] sending request", {
      url: `${API}/users/${encodeURIComponent(userId)}/follow`,
      method: isFollowing ? "DELETE" : "POST",
    });

    try {
      const res = await fetch(
        `${API}/users/${encodeURIComponent(userId)}/follow`,
        {
          method: isFollowing ? "DELETE" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("[FOLLOW] response", {
        status: res.status,
        ok: res.ok,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        console.log("[FOLLOW] error response body:", text);
        throw new Error("No se pudo actualizar el seguimiento");
      }

      // Re-sincronizar con backend tras seguir/dejar de seguir
      await refreshFollowState();

      showAlert(
        !isFollowing
          ? `Ahora sigues a ${username}`
          : `Has dejado de seguir a ${username}`,
        "success"
      );
    } catch (err) {
      console.log("[FOLLOW] catch error", err);
      const msg =
        err instanceof Error
          ? err.message
          : "No se ha podido cambiar el estado de seguimiento";

      showAlert(msg, "error");
    } finally {
      console.log("[FOLLOW] finally: stop loading");
      setFollowLoading(false);
    }
  };

  //Cargar rutas del usuario
  useEffect(() => {
    if (!username) return;

    let cancelled = false;

    const fetchRoutes = async () => {
      setLoading(true);
      setRoutes([]);
      setProfileError(null);

      try {
        const res = await fetch(
          `${API}/routes/user/${encodeURIComponent(username)}`
        );

        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) {
              setProfileError("perfil no disponible");
              setRoutes([]);
            }
            return;
          }
          throw new Error("Error cargando rutas del usuario");
        }

        const data = await res.json();
        if (cancelled) return;

        const formatted: RouteItem[] = data.map((route: any) => ({
          id: route.id ?? route._id,
          name: route.name,
          description: route.description || "Sin descripción",
          category: route.category || "sin categoría",
          points: Array.isArray(route.points)
            ? route.points.map((p: any) => [p.longitude, p.latitude])
            : [],
          visibility: route.visibility ?? false,
          rating:
            typeof route.rating === "number"
              ? route.rating
              : route.average_rating ?? route.averageRating ?? null,
          rating_count:
            typeof route.rating_count === "number"
              ? route.rating_count
              : typeof route.ratingCount === "number"
                ? route.ratingCount
                : null,
        }));

        setRoutes(formatted);
      } catch (err) {
        if (cancelled) return;

        const msg =
          err instanceof Error
            ? err.message
            : "No se han podido cargar las rutas del usuario";

        showAlert(msg, "error");
        setProfileError("perfil no disponible");
        setRoutes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRoutes();

    return () => {
      cancelled = true;
    };
  }, [username, showAlert]);

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

        <div className="usercard__header-main">
          <div>
            <h2 className="usercard__username">{username}</h2>
            <p className="usercard__email">{email}</p>
          </div>

          {shouldShowFollowButton && (
            <button
              type="button"
              className={`usercard__follow-btn ${isFollowing ? "usercard__follow-btn--following" : ""
                }`}
              onClick={handleFollowClick}
              disabled={followLoading}
            >
              {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
            </button>
          )}
        </div>
      </div>

      <h3 className="usercard__routes-title">Rutas del usuario '{username}'</h3>

      <div className="usercard__routes">
        {profileError ? (
          <p className="muted">{profileError}</p>
        ) : loading ? (
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
              images={r.images ?? []}
              distanceKm={r.distanceKm}
              durationMinutes={r.durationMinutes}
              difficulty={r.difficulty}
              ratingAverage={r.rating ?? null}
              ratingCount={r.rating_count ?? null}
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
