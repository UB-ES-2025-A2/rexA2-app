import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import MapView from "../components/MapView";
import RouteCard from "../components/RouteCreateCard/RouteCard";
import RoutePreviewCard from "../components/RoutePreviewCard/RoutePreviewCard";
import RouteDetailsCard from "../components/RouteViewCard/RouteDetailsCard";
import { useAuth } from "../context/AuthContext";
import { useRouteCard } from "../components/RouteCreateCard/useRouteCard";
import { useRequireAuth } from "../hooks/useRequireAuth";
import type { Category } from "../components/types";
import { useAlert } from "../context/AlertContext";

import "../styles/Home.css";
import { useNavigate } from "react-router-dom";
import UserPreviewCard from "../components/UserViewCard/UserPreviewCard";
import UserCardView from "../components/UserViewCard/UserViewCard";

type RouteItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  points: Array<[number, number]>;
  visibility: boolean;
};

type SelectedUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar_url?: string | null;
};

const API = import.meta.env.VITE_API_URL || window.location.origin;

const DEFAULT_CENTER: [number, number] = [2.1734, 41.3851];
const DEFAULT_ZOOM = 11;
const GEO_ZOOM = 13;

export default function Home() {
  const { user, token, logout } = useAuth();
  const { showAlert } = useAlert();
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [routeCardOpen, setRouteCardOpen] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Array<[number, number]>>([]);
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<
    Array<[number, number]>
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | "todos">(
    "todos"
  );
  const navigate = useNavigate();

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Array<string>>(
    []
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [searchMode, setSearchMode] = useState<"routes" | "users">("routes");
  const [userQuery, setUserQuery] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  const openAuth = (m: "login" | "signup" = "login") => {
    setMode(m);
    setAuthOpen(true);
    setProfileMenuOpen(false);
  };

  const { requireAuth } = useRequireAuth(openAuth);

  function handleCloseRouteCard() {
    setRouteCardOpen(false);
    setDrawPoints([]);
  }

  const routeCtrl = useRouteCard({
    modeDefault: "draw",
    drawPoints,
    onResetPoints: () => setDrawPoints([]),
    onClose: handleCloseRouteCard,
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        let favSet = new Set<string>();
        if (token) {
          try {
            const favRes = await fetch(`${API}/favorites/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (favRes.ok) {
              const favData: { route_ids: string[] } = await favRes.json();
              favSet = new Set((favData?.route_ids ?? []).map(String));
            }
          } catch (e) {
            console.warn("Error cargando favoritos:", e);
          }
        }
        setFavoriteIds(favSet);

        const response = await fetch(`${API}/routes`);
        if (!response.ok) throw new Error("Error al cargar las rutas");
        const data = await response.json();

        const formatted: RouteItem[] = data.map((route: any) => ({
          id: route.id,
          name: route.name,
          description: route.description || "Sin descripción",
          category: route.category || "sin categoría",
          points: route.points.map((p: any) => [p.longitude, p.latitude]),
          visibility: route.visibility ?? false,
        }));

        setRoutes(formatted);
        setAvailableCategories(
          Array.from(new Set(formatted.map((r) => r.category)))
        );
      } catch (error) {
        console.error("Error obteniendo rutas:", error);
      }
    };

    fetchAll();
  }, [token]);

  useEffect(() => {
    if (searchMode !== "users") return;

    const q = userQuery.trim() || "all";

    const timeout = setTimeout(async () => {
      setUsersLoading(true);
      try {
        const res = await fetch(
          `${API}/users/search?q=${encodeURIComponent(q)}`
        );
        if (!res.ok) throw new Error("Error cargando usuarios");
        const data = await res.json();
        console.log(data);
        setUsers(data);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "No se han podido cargar los resultados";
        showAlert(msg, "error");
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchMode, userQuery, showAlert]);

  const toggleProfileMenu = () => setProfileMenuOpen((v) => !v);

  useEffect(() => {
    if (user || token) {
      setProfileMenuOpen(false);
      setAuthOpen(false);
    }
  }, [user, token]);

  const handleMapClick = (lng: number, lat: number) => {
    setDrawPoints((prev) => [...prev, [lng, lat]]);
  };

  useEffect(() => {
    let cancelled = false;
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        setMapCenter([longitude, latitude]);
        setMapZoom(GEO_ZOOM);
      },
      () => {
        if (cancelled) return;
        setMapCenter(DEFAULT_CENTER);
        setMapZoom(DEFAULT_ZOOM);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenUser = (u: any) => {
    setSelectedRoute(null);
    setRouteCardOpen(false);
    setSelectedRoutePoints([]);

    setSelectedUser({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      avatar_url: u.avatar_url,
    });
  };

  return (
    <div className="home">
      <header className="home__header">
        <div className="brand">REX</div>

        <div className="profile-menu-container">
          <button
            className="profile-menu-btn"
            onClick={() => {
              if (user || token) toggleProfileMenu();
              else openAuth("login");
            }}
            aria-label="Profile"
            aria-haspopup={user || token ? "menu" : undefined}
            aria-expanded={user || token ? profileMenuOpen : undefined}
          >
            <span>👤</span>
          </button>

          {user || token ? (
            <div
              className={`profile-menu ${profileMenuOpen ? "open" : ""}`}
              role="menu"
              aria-label="Profile menu"
            >
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate("/perfil");
                }}
              >
                Mi perfil
              </button>
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  logout();
                  setProfileMenuOpen(false);
                }}
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="home__content relative">
        <div className="home__left-skeleton">
          {routeCardOpen ? (
            <RouteCard
              ctrl={routeCtrl}
              modeDefault="draw"
              drawPoints={drawPoints}
              onResetPoints={() => setDrawPoints([])}
              onClose={handleCloseRouteCard}
            />
          ) : selectedRoute ? (
            <RouteDetailsCard
              routeId={selectedRoute.id}
              name={selectedRoute.name}
              description={selectedRoute.description}
              category={selectedRoute.category as Category}
              points={selectedRoute.points}
              isPrivate={!selectedRoute.visibility}
              onClose={() => setSelectedRoute(null)}
            />
          ) : selectedUser ? (
            <UserCardView
              username={selectedUser.username}
              email={selectedUser.email}
              avatarUrl={selectedUser.avatar_url}
              onClose={() => setSelectedUser(null)}
              onRouteClick={(route) => {
                setSelectedRoute(route);
                setSelectedRoutePoints(route.points);
              }}
            />
          ) : (
            <div>
              <div className="container">
                <div className="tabs">
                  <input
                    type="radio"
                    id="radio-1"
                    name="tabs"
                    checked={searchMode === "routes"}
                    onChange={() => setSearchMode("routes")}
                  />
                  <label className="tab" htmlFor="radio-1">
                    Rutas
                  </label>

                  <input
                    type="radio"
                    id="radio-2"
                    name="tabs"
                    checked={searchMode === "users"}
                    onChange={() => setSearchMode("users")}
                  />
                  <label className="tab" htmlFor="radio-2">
                    Usuarios
                  </label>

                  <span className="glider"></span>
                </div>
              </div>

              {searchMode === "routes" ? (
                <>
                  <div className="category-filter">
                    <label className="category-label">
                      Filtrar por categoría
                    </label>
                    <select
                      className="category-select"
                      value={selectedCategory}
                      onChange={(e) =>
                        setSelectedCategory(
                          e.target.value as Category | "todos"
                        )
                      }
                    >
                      <option value="todos">Todas</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {routes.length === 0 ? (
                    <p>No hay rutas disponibles</p>
                  ) : (
                    <div className="route-list">
                      {routes
                        .filter(
                          (r) =>
                            selectedCategory === "todos" ||
                            r.category === selectedCategory
                        )
                        .map((r) => (
                          <RoutePreviewCard
                            key={r.id}
                            id={r.id}
                            name={r.name}
                            category={r.category as Category}
                            points={r.points}
                            initialSaved={favoriteIds.has(String(r.id))}
                            onClick={() =>
                              requireAuth(() => {
                                setSelectedRoute(r);
                                setSelectedRoutePoints(r.points);
                              })
                            }
                          />
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="user-search-container">
                    <input
                      type="text"
                      autoComplete="off"
                      className="input"
                      placeholder="Buscar usuario..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                    />
                  </div>

                  {usersLoading ? (
                    <p>Cargando usuarios... </p>
                  ) : users.length === 0 ? (
                    <p>
                      {userQuery.trim()
                        ? "Sin coincidencias"
                        : "No hay usuarios."}
                    </p>
                  ) : (
                    <div className="user-list">
                      {users.map((u) => (
                        <UserPreviewCard
                          key={u.id}
                          id={u.id}
                          username={u.username}
                          email={u.email}
                          name={u.name}
                          avatar_url={u.avatar_url}
                          onClick={() => handleOpenUser(u)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="home__map-skeleton">
          <MapView
            className="home__map-skeleton"
            center={mapCenter}
            zoom={mapZoom}
            allowPickPoint={routeCardOpen}
            onPickPoint={handleMapClick}
            highlightPoints={selectedRoutePoints}
          />

          <button
            className="fab"
            onClick={() =>
              requireAuth(() => {
                setSelectedRoute(null);
                setSelectedUser(null);
                setRouteCardOpen((prev) => {
                  setDrawPoints([]);
                  setSelectedRoutePoints([]);
                  return !prev;
                });
              })
            }
            title={routeCardOpen ? "Volver a la lista" : "Crear ruta"}
          >
            {routeCardOpen ? "←" : "＋"}
          </button>
        </div>
      </main>

      <Modal open={authOpen} onClose={() => setAuthOpen(false)}>
        <AuthCard
          mode={mode}
          onSwitchMode={setMode}
          onSubmit={(values) => {
            setAuthOpen(false);
            console.log("Submit", mode, values);
          }}
        />
      </Modal>
    </div>
  );
}
