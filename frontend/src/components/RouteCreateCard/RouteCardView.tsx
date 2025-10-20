// src/components/RouteCard/RouteCardView.tsx
import React from "react";
import type { Category, Mode } from "../types";

type Props = {
  // estado/control
  mode: Mode;
  name: string;
  isPrivate: boolean;
  category: Category | "";

  // refs y datos
  geocoderRef: React.RefObject<HTMLDivElement | null>;
  searchPoints: Array<[number, number]>;
  drawPoints: Array<[number, number]>;
  selectedCoord: [number, number] | null;

  // handlers
  onChangeName: (v: string) => void;
  onTogglePrivate: (v: boolean) => void;
  onChangeCategory: (v: Category | "") => void;
  onChangeMode: (m: Mode) => void;
  onAddSearchPoint: () => void;
  onClearSearchPoints: () => void;
  onRemoveSearchPoint: (idx: number) => void;
  onResetDrawPoints?: () => void;
  onSave: () => void | Promise<void>;
};

const RouteCardView: React.FC<Props> = ({
  mode,
  name,
  isPrivate,
  category,
  geocoderRef,
  searchPoints,
  drawPoints,
  selectedCoord,
  onChangeName,
  onTogglePrivate,
  onChangeCategory,
  onChangeMode,
  onAddSearchPoint,
  onClearSearchPoints,
  onRemoveSearchPoint,
  onResetDrawPoints,
  onSave,
}) => {
  return (
    <div className="route-card-panel">
      <h2 className="route__title">Crear Ruta</h2>

      <div className="input-group">
        <label htmlFor="route-name">Nombre</label>
        <input
          id="route-name"
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Ej: Ruta al trabajo"
        />
      </div>

      <div className="route__tabs">
        <button
          className={`route__tab-btn ${mode === "search" ? "active" : ""}`}
          onClick={() => onChangeMode("search")}
        >
          Buscar ubicación
        </button>
        <button
          className={`route__tab-btn ${mode === "draw" ? "active" : ""}`}
          onClick={() => onChangeMode("draw")}
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
            <div className="search-actions">
              <button
                className="btn"
                disabled={!selectedCoord}
                onClick={onAddSearchPoint}
                title="Añadir el resultado actual como punto"
              >
                Añadir punto
              </button>
              <button
                className="btn"
                onClick={onClearSearchPoints}
                title="Vaciar lista de puntos"
              >
                Limpiar puntos
              </button>
            </div>
          </div>

          <ul className="route__points-list">
            {searchPoints.map(([lng, lat], idx) => (
              <li key={idx} className="route__point-row">
                <span>{idx + 1}:</span>
                <code>
                  {lng.toFixed(5)}, {lat.toFixed(5)}
                </code>
                <button
                  className="icon-btn"
                  onClick={() => onRemoveSearchPoint(idx)}
                  title="Eliminar"
                >
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
          <p className="draw-instruction">
            Haz clic en el mapa para agregar puntos a la ruta.
          </p>
          <ul className="route__points-list">
            {drawPoints.map(([lng, lat], idx) => (
              <li key={idx} className="route__point-row">
                {idx + 1}: {lng.toFixed(5)}, {lat.toFixed(5)}
              </li>
            ))}
            {drawPoints.length === 0 && (
              <li className="muted">No has añadido puntos todavía.</li>
            )}
          </ul>
          <div className="input-group">
            {onResetDrawPoints && (
              <button
                className="btn"
                onClick={onResetDrawPoints}
                title="Borrar puntos dibujados"
              >
                Reiniciar puntos
              </button>
            )}
          </div>
        </>
      )}

      <div className="input-group">
        <label>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => onTogglePrivate(e.target.checked)}
          />
          Privada
        </label>
      </div>

      <div className="input-group">
        <label htmlFor="category">Categoría</label>
        <select
          id="category"
          value={category}
          onChange={(e) => onChangeCategory(e.target.value as Category | "")}
        >
          <option value="" disabled>
            Selecciona una categoría…
          </option>
          <option value="entretenimiento">Entretenimiento</option>
          <option value="trabajo">Trabajo</option>
        </select>
      </div>

      <button className="btn primary" onClick={onSave}>
        Guardar Ruta
      </button>
    </div>
  );
};

export default RouteCardView;
