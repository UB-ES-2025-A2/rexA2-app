import { useState } from "react";

export default function RouteCard({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [mode, setMode] = useState<"draw" | "search">("draw");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = () => {
    const payload = { mode, title, location };

    fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    onSubmit(payload);
  };

  return (
    <div className="route-card-panel">
      <h2 className="route__title">Crear Ruta</h2>

      <div className="route__tabs">
        <button
          className={`route__tab-btn ${mode === "draw" ? "active" : ""}`}
          onClick={() => setMode("draw")}
        >Dibujar</button>
        <button
          className={`route__tab-btn ${mode === "search" ? "active" : ""}`}
          onClick={() => setMode("search")}
        >Buscar</button>
      </div>

      <div className="route__form">
        <div className="field">
          <input
            type="text"
            className="field__input"
            placeholder=" "
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="field__label">Título</label>
        </div>

        {mode === "search" && (
          <div className="field">
            <input
              type="text"
              className="field__input"
              placeholder=" "
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <label className="field__label">Ubicación</label>
          </div>
        )}


        <button className="btn btn--primary" onClick={handleSubmit}>
          Guardar Ruta
        </button>
      </div>
    </div>
  );
}
