import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import RouteDetailsCard from "../components/RouteViewCard/RouteDetailsCard";
import "../styles/RouteDetail.css";
import { subscribeToRatingUpdates } from "../services/ratingEvents";

type ApiPoint = { latitude?: number; longitude?: number; lat?: number; lng?: number } | [number, number];
type ApiRoute = {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  category?: string;
  visibility?: boolean;
  points?: ApiPoint[];
  distance_km?: number | null;
  duration_minutes?: number | null;
  difficulty?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  images?: string[];
};

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/$/, "");

const normalizePoints = (points: ApiPoint[] | undefined): Array<[number, number]> => {
  if (!points) return [];
  return points
    .map((p) => {
      if (Array.isArray(p)) return [p[0], p[1]] as [number, number];
      const lng = p.longitude ?? (p as any).lng;
      const lat = p.latitude ?? (p as any).lat;
      if (lng == null || lat == null) return null;
      return [lng, lat] as [number, number];
    })
    .filter(Boolean) as Array<[number, number]>;
};

export default function RouteDetail() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackRoute = (location.state as any)?.fallbackRoute as ApiRoute | undefined;

  const [route, setRoute] = useState<ApiRoute | null>(fallbackRoute || null);
  const [loading, setLoading] = useState<boolean>(!fallbackRoute);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    const controller = new AbortController();
    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/routes/${routeId}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`No se pudo cargar la ruta (${res.status})`);
        }
        const data = (await res.json()) as ApiRoute;
        if (!controller.signal.aborted) setRoute(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la ruta.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (!fallbackRoute || fallbackRoute.id !== routeId) {
      fetchRoute();
    }

    return () => controller.abort();
  }, [routeId, fallbackRoute]);

  useEffect(() => {
    if (!routeId) return;
    const unsubscribe = subscribeToRatingUpdates(({ route_id, average, count }) => {
      if (String(route_id) !== String(routeId)) return;
      setRoute((prev) =>
        prev
          ? {
              ...prev,
              rating: average ?? prev.rating ?? null,
              rating_count: count ?? prev.rating_count ?? null,
            }
          : prev
      );
    });

    return unsubscribe;
  }, [routeId]);

  const points = useMemo(() => normalizePoints(route?.points), [route]);

  return (
    <div className="route-detail">
      <header className="primary-header">
        <div className="header__start">
          <Link to="/descubrir" className="brand" aria-label="Volver a descubrir">
            REX
          </Link>
          <nav className="main-nav" aria-label="Navegación principal">
            <NavLink
              to="/descubrir"
              className={({ isActive }) =>
                `main-nav__link ${isActive ? "active" : ""}`
              }
            >
              Descubrir
            </NavLink>
            <NavLink
              to="/mapa"
              end
              className={({ isActive }) =>
                `main-nav__link ${isActive ? "active" : ""}`
              }
            >
              Mapa
            </NavLink>
          </nav>
        </div>

        <div className="header__cta">
          <button className="pill-btn" onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </header>

      <main className="route-detail__body">
        {loading ? (
          <div className="route-detail__state">Cargando ruta...</div>
        ) : error ? (
          <div className="route-detail__state error">{error}</div>
        ) : route ? (
          <div className="route-detail__card">
            <RouteDetailsCard
              routeId={route.id || (route as any)._id || routeId || ""}
              name={route.name}
              description={route.description || "Sin descripción"}
              category={(route.category as any) || "otros"}
              points={points}
              distanceKm={route.distance_km ?? (route as any).distanceKm ?? null}
              durationMinutes={route.duration_minutes ?? (route as any).durationMinutes ?? null}
              difficulty={(route as any).difficulty ?? null}
              isPrivate={!route.visibility}
              rating={route.rating ?? null}
              ratingCount={route.rating_count ?? null}
              onClose={() => navigate(-1)}
            />
          </div>
        ) : (
          <div className="route-detail__state">No se encontró la ruta.</div>
        )}
      </main>
    </div>
  );
}
