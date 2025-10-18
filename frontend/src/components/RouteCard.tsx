import { useState } from "react";

type Props = {
  mode: "search" | "draw";
  setMode: (m: "search" | "draw") => void;
  locationName: string;
  locationCoords: [number, number] | null;
  points: [number, number][];
  setPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
  onSubmit: (data: any) => void;
};

export default function RouteCard({
  mode,
  setMode,
  locationName,
  locationCoords,
  points,
  setPoints,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");

  const handleSave = async () => {
    const routeData: any = { title };
    if (mode === "search") {
      routeData.location = {
        name: locationName,
        coordinates: locationCoords,
      };
    } else {
      routeData.points = points;
    }

    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeData),
      });
      const json = await res.json();
      onSubmit(json);
    } catch (err) {
      console.error("Error al guardar la ruta", err);
    }
  };

  return (
    <div className="home__left-skeleton auth-card">
      <h2 className="title">Crear nueva ruta</h2>

      <div className="input-group">
        <label htmlFor="route-title">Título</label>
        <input
          id="route-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la ruta"
        />
      </div>

      <div className="mode-switch">
        <button
          className={mode === "search" ? "active" : ""}
          onClick={() => {
            setMode("search");
            setPoints([]);
          }}
        >
          Buscar
        </button>
        <button
          className={mode === "draw" ? "active" : ""}
          onClick={() => {
            setMode("draw");
          }}
        >
          Dibujar
        </button>
      </div>

      {mode === "search" && (
        <div className="input-group">
          <label>Ubicación</label>
          {locationName ? (
            <p className="selected-location">📍 {locationName}</p>
          ) : (
            <p>Selecciona un lugar en el buscador</p>
          )}
        </div>
      )}

      {mode === "draw" && (
        <div className="draw-instruction">
          Haz clic en el mapa para añadir puntos a la ruta. ({points.length} punto
          {points.length === 1 ? "" : "s"})
        </div>
      )}

      <button className="btn primary" onClick={handleSave}>
        Guardar Ruta
      </button>
    </div>
  );
}
