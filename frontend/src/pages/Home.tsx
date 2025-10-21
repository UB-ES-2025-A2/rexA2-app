import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import MapView from "../components/MapView";
import RouteCard from "../components/RouteCreateCard/RouteCard";
import RoutePreviewCard from "../components/RouteViewCard/RoutePreviewCard";
import { useAuth } from "../context/AuthContext";
import type { Category } from "../components/types";
import "../styles/Home.css";

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

  useEffect(() => {
    const fetchedRoutes: {
      id: number;
      name: string;
      category: string;
      points: [number, number][];
    }[] = [
      {
        id: 1,
        name: "Ruta al parque",
        category: "entretenimiento",
        points: [
          [2.17617, 41.37691],
          [2.16682, 41.38322],
          [2.16012, 41.38741],
          [2.16312, 41.39224],
          [2.16553, 41.39984],
          [2.18545, 41.39861],
          [2.2009, 41.40628],
        ],
      },
      {
        id: 2,
        name: "Ruta histórica",
        category: "historia",
        points: [
          [2.1744, 41.3825],
          [2.173, 41.384],
          [2.171, 41.385],
        ],
      },
    ];

    setRoutes(fetchedRoutes);

    const uniqueCategories = Array.from(new Set(fetchedRoutes.map(r => r.category)));
    setAvailableCategories(uniqueCategories);
  }, []);

  const openAuth = (m: "login" | "signup" = "login") => {
    setMode(m);
    setAuthOpen(true);
    setProfileMenuOpen(false);  // Cerrar el perfil si abrimos el login
  };

  const toggleProfileMenu = () => setProfileMenuOpen((v) => !v);

  useEffect(() => {
    if (user || token) {
      setProfileMenuOpen(false);  // Cierra el menú de perfil si ya está logeado
      setAuthOpen(false);          // Cierra el modal de login/signup
    }
  }, [user, token]);

  const handleMapClick = (lng: number, lat: number) => {
    setDrawPoints((prev) => [...prev, [lng, lat]]);
  };

  const handleCloseRouteCard = () => {
    setRouteCardOpen(false);
    setDrawPoints([]);
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
                toggleProfileMenu();      // Si ya está logeado, muestra el menú
              } else {
                openAuth("login");        // Si no, abre el login
              }
            }}
            aria-label="Profile"
            aria-haspopup={user || token ? "menu" : undefined}
            aria-expanded={user || token ? profileMenuOpen : undefined}
          >
            <span>👤</span>
          </button>

          {user || token ? (  // Si hay usuario o token, mostramos el menú
            <div className={`profile-menu ${profileMenuOpen ? "open" : ""}`} role="menu" aria-label="Profile menu">
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                }}
              >
                Mi perfil
              </button>
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                }}
              >
                Ajustes
              </button>
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  logout();               // Limpiar sesión
                  setProfileMenuOpen(false); // Cerrar menú
                }}
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="home__content">
        <div className="home__left-skeleton">
          {routeCardOpen ? (
            <RouteCard
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
                        onClick={() => {
                          setSelectedRoutePoints(r.points);
                        }}
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
