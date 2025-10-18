import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

type Props = {
  modeDefault?: "search" | "draw";
  drawPoints?: Array<[number, number]>;
  onResetPoints?: () => void;
  onClose?: () => void;
};

const RouteCard: React.FC<Props> = ({
  modeDefault = "search",
  drawPoints = [],
  onResetPoints,
  onClose,
}) => {
  const [mode, setMode] = useState<"search" | "draw">(modeDefault);

  const geocoderRef = useRef<HTMLDivElement | null>(null);
  const geocoderInstanceRef = useRef<MapboxGeocoder | null>(null);
  const [selectedSearchCoord, setSelectedSearchCoord] = useState<[number, number] | null>(null);
  const [searchPoints, setSearchPoints] = useState<Array<[number, number]>>([]);

  useEffect(() => {
    if (mode !== "search") {
      if (geocoderInstanceRef.current) {
        geocoderInstanceRef.current.off("result", () => {});
        geocoderInstanceRef.current.off("clear", () => {});
        geocoderInstanceRef.current.clear();
        geocoderInstanceRef.current = null;
      }
      if (geocoderRef.current) {
        geocoderRef.current.innerHTML = "";
      }
      setSelectedSearchCoord(null);
      return;
    }

    if (!geocoderRef.current || geocoderInstanceRef.current) return;

    const geocoder = new MapboxGeocoder({
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: "Busca un sitio para añadir…",
    });

    geocoder.addTo(geocoderRef.current);

    geocoder.on("result", (e: any) => {
      const c = e?.result?.center as [number, number] | undefined;
      setSelectedSearchCoord(c ?? null);
    });

    geocoder.on("clear", () => {
      setSelectedSearchCoord(null);
    });

    geocoderInstanceRef.current = geocoder;

    return () => {
      try {
        geocoder.off("result", () => {});
        geocoder.off("clear", () => {});
        geocoder.clear();
      } catch {}
      geocoderInstanceRef.current = null;
      if (geocoderRef.current) geocoderRef.current.innerHTML = "";
    };
  }, [mode]);

  const handleAddSearchPoint = () => {
    if (!selectedSearchCoord) return;
    setSearchPoints((prev) => [...prev, selectedSearchCoord]);
    try {
      geocoderInstanceRef.current?.clear();
    } catch {}
    setSelectedSearchCoord(null);
  };

  const handleRemoveSearchPoint = (idx: number) => {
    setSearchPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearSearchPoints = () => {
    setSearchPoints([]);
    setSelectedSearchCoord(null);
    try {
      geocoderInstanceRef.current?.clear();
    } catch {}
  };

  const handleModeChange = (m: "search" | "draw") => {
    setMode(m);
    if (m === "search") {
      onResetPoints?.();
    } else {
      setSearchPoints([]);
      setSelectedSearchCoord(null);
      try {
        geocoderInstanceRef.current?.clear();
      } catch {}
    }
  };

  const handleSave = async () => {
    const points = mode === "draw" ? drawPoints : searchPoints;

    if (!points || points.length === 0) {
      alert("Añade al menos un punto antes de guardar.");
      return;
    }

    const payload = { points } as { points: Array<[number, number]> };

    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      try {
        const json = await res.json();
        console.log("Ruta enviada:", json);
      } catch {
        console.log("Ruta enviada (sin JSON en la respuesta)");
      }

      onClose?.();
    } catch (err) {
      console.error("Error guardando ruta", err);
      alert("No se pudo guardar la ruta. Revisa la consola.");
    }
  };

  return (
    <div className="route-card-panel">
      <h2 className="route__title">Crear Ruta</h2>

      <div className="route__tabs">
        <button
          className={`route__tab-btn ${mode === "search" ? "active" : ""}`}
          onClick={() => handleModeChange("search")}
        >
          Buscar ubicación
        </button>
        <button
          className={`route__tab-btn ${mode === "draw" ? "active" : ""}`}
          onClick={() => handleModeChange("draw")}
        >
          Dibujar ruta
        </button>
      </div>

      {mode === "search" && (
        <>
          <div className="input-group">
            <label>Ubicación</label>
            <div ref={geocoderRef} className="geocoder-container" />
          </div>

          <div className="input-group">
            <div className="search-actions" style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                disabled={!selectedSearchCoord}
                onClick={handleAddSearchPoint}
                title="Añadir el resultado actual como punto"
              >
                Añadir punto
              </button>
              <button className="btn" onClick={handleClearSearchPoints} title="Vaciar lista de puntos">
                Limpiar puntos
              </button>
            </div>
          </div>

          <ul className="route__points-list">
            {searchPoints.map(([lng, lat], idx) => (
              <li key={idx} className="route__point-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span>{idx + 1}:</span>
                <code style={{ userSelect: "text" }}>{lng.toFixed(5)}, {lat.toFixed(5)}</code>
                <button className="icon-btn" onClick={() => handleRemoveSearchPoint(idx)} title="Eliminar">
                  ✕
                </button>
              </li>
            ))}
            {searchPoints.length === 0 && (
              <li className="muted">No hay puntos añadidos todavía.</li>
            )}
          </ul>
        </>
      )}

      {mode === "draw" && (
        <>
          <p className="draw-instruction">Haz clic en el mapa para agregar puntos a la ruta.</p>
          <ul className="route__points-list">
            {drawPoints.map(([lng, lat], idx) => (
              <li key={idx} className="route__point-row">
                {idx + 1}: {lng.toFixed(5)}, {lat.toFixed(5)}
              </li>
            ))}
            {drawPoints.length === 0 && <li className="muted">No has añadido puntos todavía.</li>}
          </ul>

          <div className="input-group">
            <button className="btn" onClick={onResetPoints} title="Borrar puntos dibujados">
              Reiniciar puntos
            </button>
          </div>
        </>
      )}

      <button className="btn primary" onClick={handleSave}>
        Guardar Ruta
      </button>
    </div>
  );
};

export default RouteCard;
