import { useState } from "react";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import MapView from "../components/MapView";
import RouteCard from "../components/RouteCard.tsx";

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [routeCardOpen, setRouteCardOpen] = useState(false);

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
          {routeCardOpen && (
            <RouteCard
              onSubmit={(data) => {
                console.log("Ruta creada:", data);
                setRouteCardOpen(false);
              }}
            />
          )}
        </div>

        <div className="home__map-skeleton">
        <MapView
          className="home__map-skeleton"
          center={[2.1734, 41.3851]}
          zoom={13}
          allowPickPoint={routeCardOpen && mode === "draw"}
          onPickPoint={(lng, lat) => {
            console.log("Punto añadido", lng, lat);
            // Aquí puedes pasar ese punto a RouteCard por props, un contexto, o manejarlo desde Home
          }}
        />
        </div>

        <button
          className="fab"
          onClick={() => setRouteCardOpen(true)}
          title="Crear ruta"
        >
          ＋
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
