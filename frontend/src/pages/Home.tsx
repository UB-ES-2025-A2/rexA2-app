import { useState, useEffect, useCallback } from "react";
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
import CommentsModal from "../components/CommentsModal";
import RouteSearchBar from "../components/RouteSearchBar/RouteSearchBar";

import "../styles/Home.css";
import { useNavigate, useLocation } from "react-router-dom";
import UserPreviewCard from "../components/UserViewCard/UserPreviewCard";
import UserCardView from "../components/UserViewCard/UserViewCard";
import AnimatedList from "../components/AnimatedList";

type RouteItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  points: Array<[number, number]>;
  visibility: boolean;
  is_owner?: boolean;
  ownerName?: string;
  ownerUsername?: string;
  username?: string;
  email?: string;
  ownerId?: string | number;
  userId?: string | number;
  city?: string;
  createdAt?: string;
  popularity?: number | null;
  user?: { id?: string | number; username?: string; name?: string; email?: string };
};

type SelectedUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar_url?: string | null;
};

type AppliedFilters = {
  category: string;
  pointsFilter: string;
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
  const navigate = useNavigate();
  const location = useLocation();

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [showComments, setShowComments] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [searchMode, setSearchMode] = useState<"routes" | "users">("routes");
  const [routeSearchQuery, setRouteSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  // Estados para filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    category: "all",
    pointsFilter: "all",
  });

  const openAuth = (m: "login" | "signup" = "login") => {
    setMode(m);
    setAuthOpen(true);
    setProfileMenuOpen(false);
  };

  const { requireAuth } = useRequireAuth(openAuth);

  function handleCloseRouteCard() {
    setRouteCardOpen(false);
    setDrawPoints([]);
    setSelectedRoutePoints([]);
    setShowComments(false);
  }

  const routeCtrl = useRouteCard({
    modeDefault: "draw",
    drawPoints,
    onResetPoints: () => setDrawPoints([]),
    onClose: handleCloseRouteCard,
  });

  // Función para filtrar rutas según los filtros aplicados y categoría seleccionada
  const getFilteredRoutes = () => {
    let filtered = routes;

    const normalizedSearch = routeSearchQuery.trim().toLowerCase();

    // Aplicar filtros de búsqueda global
    if (appliedFilters.category !== "all") {
      filtered = filtered.filter((r) => r.category === appliedFilters.category);
    }

    if (appliedFilters.pointsFilter !== "all") {
      filtered = filtered.filter((r) => {
        const pointCount = r.points.length;
        if (appliedFilters.pointsFilter === "few") return pointCount <= 5;
        if (appliedFilters.pointsFilter === "medium")
          return pointCount > 5 && pointCount <= 15;
        if (appliedFilters.pointsFilter === "many") return pointCount > 15;
        return true;
      });
    }

    if (normalizedSearch) {
      filtered = filtered.filter((r) => {
        const createdAtText = r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("es-ES")
          : "";
        const searchBucket = [
          r.name,
          r.description,
          r.category,
          r.ownerName,
          r.ownerUsername,
          r.username,
          r.email,
          r.user?.username,
          r.user?.name,
          r.user?.email,
          createdAtText,
          r.popularity != null ? String(r.popularity) : null,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return searchBucket.some((value) =>
          value.includes(normalizedSearch)
        );
      });
    }

    return filtered;
  };

  useEffect(() => {
    const fetchAll = async () => {
      setRoutesLoading(true);
      setRoutesError(null);
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
          description: route.description || "Sin descripci?n",
          category: route.category || "sin categor?a",
          points: route.points.map((p: any) => [p.longitude, p.latitude]),
          visibility: route.visibility ?? false,
          owner_id: route.owner_id,
          user_id: route.user_id,
          city:
            route.city ||
            route.city_name ||
            route.cityName ||
            route.location?.city ||
            "",
          createdAt: route.created_at || route.createdAt || route.creation_date,
          popularity:
            route.popularity ??
            route.relevance ??
            route.popularity_score ??
            route.popularityScore ??
            null,
          ownerName:
            route.owner_name ||
            route.ownerName ||
            route.user?.name ||
            route.username ||
            "",
          ownerUsername:
            route.owner_username ||
            route.ownerUsername ||
            route.user?.username ||
            route.username ||
            "",
          ownerId:
            route.owner_id ||
            route.user_id ||
            route.user?.id ||
            route.ownerId ||
            route.userId ||
            null,
          userId: route.user_id || route.userId || route.user?.id || null,
          email: route.user?.email || route.email,
          user: route.user
            ? {
                id: route.user._id || route.user.id,
                username: route.user.username,
                name: route.user.name,
                email: route.user.email,
              }
            : route.username || route.ownerName || route.ownerUsername
            ? {
                id: route.user_id || route.owner_id,
                username: route.username,
                name: route.ownerName,
                email: route.email,
              }
            : undefined,
          username: route.username,
        }));

        setRoutes(formatted);
      } catch (error) {
        console.error("Error obteniendo rutas:", error);
        setRoutesError("No se han podido cargar los resultados");
        showAlert("No se han podido cargar los resultados", "error");
        setRoutes([]);
      } finally {
        setRoutesLoading(false);
      }
    };

    fetchAll();
  }, [token, showAlert]);

  useEffect(() => {
    if (searchMode !== "users") {
      setUsersLoading(false);
      setUsersError(null);
      return;
    }

    const q = userSearchQuery.trim() || "all";

    const timeout = setTimeout(async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const res = await fetch(
          `${API}/users/search?q=${encodeURIComponent(q)}`
        );
        if (!res.ok) throw new Error("Error cargando usuarios");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "No se han podido cargar los resultados";
        const friendlyMsg = "No se han podido cargar los resultados";
        showAlert(msg, "error");
        setUsersError(friendlyMsg);
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchMode, userSearchQuery, showAlert]);

  const toggleProfileMenu = () => setProfileMenuOpen((v) => !v);

  useEffect(() => {
    if (user || token) {
      setProfileMenuOpen(false);
      setAuthOpen(false);
    }
  }, [user, token]);

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setDrawPoints((prev) => [...prev, [lng, lat]]);
  }, []);

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

  useEffect(() => {
    const state = location.state as {
      openUserFromFollowers?: SelectedUser;
    } | null;

    if (state?.openUserFromFollowers) {
      const u = state.openUserFromFollowers;

      setSelectedRoute(null);
      setRouteCardOpen(false);
      setSelectedRoutePoints([]);
      setShowComments(false);

      setSelectedUser({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        avatar_url: u.avatar_url,
      });
    }
  }, [location.state]);

  const handleOpenUser = (u: any) => {
    setSelectedRoute(null);
    setRouteCardOpen(false);
    setSelectedRoutePoints([]);
    setShowComments(false);

    setSelectedUser({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      avatar_url: u.avatar_url,
    });
  };

  const handleApplyFilters = (filters: AppliedFilters) => {
    setAppliedFilters(filters);
  };

  // Controlar qué puntos se ven en el mapa según el modo actual
  let visiblePoints = selectedRoutePoints;
  if (routeCardOpen) {
    const { mode: createMode, searchPoints } = routeCtrl.viewProps;
    visiblePoints = createMode === "search" ? searchPoints : drawPoints;
  }

  const renderEmptyState = (title: string, subtitle?: string) => (
    <p className="empty-message">
      {title}
      {subtitle ? <span className="empty-subtext">{subtitle}</span> : null}
    </p>
  );

  return (
    <div className="home">
      <header className="home__header">
        <div className="brand">REX</div>

        {/* Buscador de rutas */}
        {!routeCardOpen && !selectedRoute && !selectedUser && (
          <RouteSearchBar
            routes={routes}
            mode={searchMode}
            query={searchMode === "routes" ? routeSearchQuery : userSearchQuery}
            onQueryChange={(q) =>
              searchMode === "routes"
                ? setRouteSearchQuery(q)
                : setUserSearchQuery(q)
            }
            onApplyFilters={handleApplyFilters}
            isLoading={searchMode === "users" ? usersLoading : routesLoading}
          />
        )}

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
              isOwnRoute={selectedRoute.is_owner || false}
              onClose={() => {
                setSelectedRoute(null);
                setSelectedRoutePoints([]);
                setShowComments(false);
              }}
              onShowComments={() => setShowComments(true)}
              onDelete={async (routeId) => {
                const res = await fetch(`${API}/routes/${routeId}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("No se pudo eliminar");
                setRoutes((prev) => prev.filter((r) => r.id !== routeId));
              }}
            />
          ) : selectedUser ? (
            <UserCardView
              userId={selectedUser.id}
              username={selectedUser.username}
              email={selectedUser.email}
              avatarUrl={selectedUser.avatar_url}
              onClose={() => setSelectedUser(null)}
              onRouteClick={(route) => {
                setSelectedRoute(route);
                setSelectedRoutePoints(route.points);
                setShowComments(false);
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
                  {routesLoading ? (
                    renderEmptyState("Cargando rutas...", "Obteniendo coincidencias")
                  ) : routesError ? (
                    renderEmptyState(routesError, "Intenta de nuevo en unos segundos")
                  ) : routes.length === 0 ? (
                    renderEmptyState("No hay rutas disponibles")
                  ) : (() => {
                    const filteredRoutes = getFilteredRoutes();

                    if (filteredRoutes.length === 0) {
                      const hasFilters =
                        appliedFilters.category !== "all" ||
                        appliedFilters.pointsFilter !== "all";
                      const hasSearch = Boolean(routeSearchQuery.trim());
                      return (
                        renderEmptyState(
                          hasFilters || hasSearch
                            ? "Sin coincidencias"
                            : "No hay rutas disponibles",
                          hasFilters || hasSearch
                            ? "Prueba ajustar la búsqueda o los filtros"
                            : undefined
                        )
                      );
                    }

                    const routeItems = filteredRoutes.map((r) => (
                      <div className="route-row" key={r.id}>
                        <RoutePreviewCard
                          id={r.id}
                          name={r.name}
                          category={r.category as Category}
                          points={r.points}
                          initialSaved={favoriteIds.has(String(r.id))}
                        />
                      </div>
                    ));

                    return (
                      <AnimatedList
                        items={routeItems}
                        className="routes-animated-list"
                        itemClassName="routes-animated-item"
                        showGradients
                        onItemSelect={(index) =>
                          requireAuth(() => {
                            const route = filteredRoutes[index];
                            if (!route) return;
                            setSelectedRoute(route);
                            setSelectedRoutePoints(route.points);
                          })
                        }
                      />
                    );
                  })()}
                </>
              ) : (
                <>
                  {usersLoading ? (
                    renderEmptyState("Cargando usuarios...", "Buscando coincidencias")
                  ) : usersError ? (
                    renderEmptyState(usersError, "Inténtalo de nuevo en unos segundos")
                  ) : users.length === 0 ? (
                    renderEmptyState(
                      userSearchQuery.trim() ? "Sin coincidencias" : "No hay usuarios.",
                      userSearchQuery.trim()
                        ? "Prueba con otro nombre o email"
                        : "Todavía no hay usuarios para mostrar"
                    )
                  ) : (
                    (() => {
                      const userItems = users.map((u) => (
                        <div className="user-row" key={u.id}>
                          <UserPreviewCard
                            id={u.id}
                            username={u.username}
                            email={u.email}
                            name={u.name}
                            avatar_url={u.avatar_url}
                          />
                        </div>
                      ));

                      return (
                        <AnimatedList
                          items={userItems}
                          className="users-animated-list"
                          itemClassName="users-animated-item"
                          showGradients
                          onItemSelect={(index) => {
                            const u = users[index];
                            if (!u) return;
                            handleOpenUser(u);
                          }}
                        />
                      );
                    })()
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="home__map-skeleton">
          {showComments && selectedRoute ? (
            <div className="comments-full">
              <CommentsModal
                open={showComments}
                onClose={() => setShowComments(false)}
                routeId={selectedRoute.id}
                placement="panel"
              />
            </div>
          ) : (
            <>
              <MapView
                className="home__map-skeleton"
                center={mapCenter}
                zoom={mapZoom}
                allowPickPoint={routeCardOpen}
                onPickPoint={handleMapClick}
                highlightPoints={visiblePoints}
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
                      setShowComments(false);
                      return !prev;
                    });
                  })
                }
                title={routeCardOpen ? "Volver a la lista" : "Crear ruta"}
              >
                {routeCardOpen ? "←" : "＋"}
              </button>
            </>
          )}
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
