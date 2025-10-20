import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import MapView from "../components/MapView";
import RouteCard from "../components/RouteCreateCard/RouteCard";
import RoutePreviewCard from "../components/RouteViewCard/RoutePreviewCard";
import type { Category } from "../components/types";

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [routeCardOpen, setRouteCardOpen] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Array<[number, number]>>([]);

  const [selectedRoutePoints, setSelectedRoutePoints] = useState<Array<[number, number]>>([]);

  const [routes, setRoutes] = useState<Array<{
    id: number;
    name: string;
    category: string;
    points: Array<[number, number]>;
  }>>([]);

  /*
  useEffect(() => { 
    fetch("/api/routes") .then((res) => res.json()) 
    .then((data) => setRoutes(data)) 
    .catch((error) => console.error("Error al cargar rutas:", error)); 
  }, []);
  */

  useEffect(() => {
    setRoutes([
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
          [2.20090, 41.40628],
        ],
      },
    ]);
  }, []);

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
        <button
          className="icon-btn"
          onClick={() => {
            setMode("login");
            setAuthOpen(true);
          }}
          aria-label="Profile"
        >
          <span>👤</span>
        </button>
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
              <h2>Rutas existentes</h2>
              {routes.length === 0 ? (
                <p>No hay rutas disponibles.</p>
              ) : (
                <div className="route-list">
                  {routes.map((r) => (
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
            center={[2.1734, 41.3851]}
            zoom={13}
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
            console.log("Submit", mode, values);
          }}
        />
      </Modal>
    </div>
  );
}
