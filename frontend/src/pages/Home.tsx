import { useState } from "react";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import MapView from "../components/MapView";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="home">
      
      <header className="home__header">
        <div className="brand">REX</div>
        <button
          className="icon-btn"
          onClick={() => { setMode("login"); setOpen(true); }}
          aria-label="Profile"
        >
          <span>👤</span>
        </button>
      </header>

      <main className="home__content">
        <div className="home__left-skeleton" />
        <div className="home__map-skeleton">
          <MapView
            className="home__map-skeleton"
            center={[2.1734, 41.3851]} // Barcelona
            zoom={11}

          />
        </div>
        <button
          className="fab"
          onClick={() => {

            // Modal rutas 
          }}
          title="Create route"
        >
          ＋
        </button>
      </main>

      <Modal open={open} onClose={() => setOpen(false)}>
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
