import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import MapView from "../components/MapView";
import RouteCard from "../components/RouteCreateCard/RouteCard";
import RoutePreviewCard from "../components/RouteViewCard/RoutePreviewCard";
import { useAuth } from "../context/AuthContext";
import type { Category } from "../components/types";
import { useRouteCard } from "../components/RouteCreateCard/useRouteCard";

import "../styles/Home.css";

const API = import.meta.env.VITE_API_URL;

export default function Home() {
  const { user, token, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [routeCardOpen, setRouteCardOpen] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Array<[number, number]>>([]);
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<Array<[number, number]>>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | "todos">("todos");

  const [routes, setRoutes] = useState<Array<{
    id: number;
    name: string;
    category: string;
    points: Array<[number, number]>;
  }>>([]);

  const [availableCategories, setAvailableCategories] = useState<Array<string>>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

    const fetchRoutes = async () => {
      try {
        const response = await fetch(`${API}/routes`);
        if (!response.ok) throw new Error("Error al cargar las rutas");

        const data = await response.json();

        const formatted = data.map((route: any) => ({
          id: route._id,
          name: route.name,
          category: route.category || "sin categoría",
          points: route.points.map((p: any) => [p.longitude, p.latitude]),
        }));

        setRoutes(formatted);
        const uniqueCategories = Array.from(new Set(formatted.map((r) => r.category)));
        setAvailableCategories(uniqueCategories);
      } catch (error) {
        console.error("Error obteniendo rutas:", error);
      }
    };

    fetchRoutes();
  }, []);

  const openAuth = (m: "login" | "signup" = "login") => {
    setMode(m);
    setAuthOpen(true);
    setProfileMenuOpen(false);
  };

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

  return (
    <div className="home">
      <header className="home__header">
        <div className="brand">REX</div>
        <div className="profile-menu-container">
          <button
            className="profile-menu-btn"
            onClick={() => {
              if (user || token) {
                toggleProfileMenu();
              } else {
                openAuth("login");
              }
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
                onClick={() => setProfileMenuOpen(false)}
              >
                Mi perfil
              </button>
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => setProfileMenuOpen(false)}
              >
                Ajustes
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
          ) : (
            <div>
              <div className="category-filter">
                <div>
                  <label className="category-label">Filtrar por categoría</label>
                  <select
                    className="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as Category | "todos")}
                  >
                    <option value="todos">Todas</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {routes.length === 0 ? (
                <p>No hay rutas disponibles.</p>
              ) : (
                <div className="route-list">
                  {routes
                    .filter((r) => selectedCategory === "todos" || r.category === selectedCategory)
                    .map((r) => (
                      <RoutePreviewCard
                        key={r.id}
                        id={r.id}
                        name={r.name}
                        category={r.category as Category}
                        points={r.points}
                        onClick={() => setSelectedRoutePoints(r.points)}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="home__map-skeleton">
          <MapView
            className="home__map-skeleton"
            center={[2.1734, 41.3851]} // Barcelona
            zoom={11}
            allowPickPoint={routeCardOpen}
            onPickPoint={handleMapClick}
            highlightPoints={selectedRoutePoints}
          />
        </div>

        <button
          className="fab"
          onClick={() => {
            setRouteCardOpen((prev) => {
              setDrawPoints([]);
              setSelectedRoutePoints([]);
              return !prev;
            });
          }}
          title={routeCardOpen ? "Volver a la lista" : "Crear ruta"}
        >
          {routeCardOpen ? "←" : "＋"}
        </button>

      
      </main>


      
    </div>
    
  );
}
