import React from "react";
import type { Category, Mode } from "../types";

type Props = {
  mode: Mode;
  name: string;
  description: string;
  isPrivate: boolean;
  category: Category | "";

  geocoderRef: React.RefObject<HTMLDivElement | null>;
  searchPoints: Array<[number, number]>;
  drawPoints: Array<[number, number]>;
  selectedCoord: [number, number] | null;

  onChangeName: (v: string) => void;
  onTogglePrivate: (v: boolean) => void;
  onChangeCategory: (v: Category | "") => void;
  onChangeMode: (m: Mode) => void;
  onAddSearchPoint: () => void;
  onClearSearchPoints: () => void;
  onRemoveSearchPoint: (idx: number) => void;
  onResetDrawPoints?: () => void;
  onSave: () => void | Promise<void>;
  onChangeDescription: (v: string) => void;
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
  description,

  onChangeName,
  onTogglePrivate,
  onChangeCategory,
  onChangeMode,
  onAddSearchPoint,
  onClearSearchPoints,
  onRemoveSearchPoint,
  onResetDrawPoints,
  onSave,
  onChangeDescription,
}) => {
  return (
    <div className="route-card-panel">
      <div className="route-card__header">
        <div>
          <p className="route-card__eyebrow">Crea tu recorrido</p>
          <h2 className="route__title">Crear Ruta</h2>
          <p className="route-card__helper">
            Define los datos básicos y elige si prefieres buscar puntos o dibujarlos en el mapa.
          </p>
        </div>
        <span className="route-card__pill">
          {mode === "search" ? "Modo buscar" : "Modo dibujar"}
        </span>
      </div>

      <div className="route-card__body">
        <div className="route-card__section">
          <div className="route-card__section-head">
            <span className="route-card__section-title">Detalles principales</span>
            <span className="route-card__helper">Nombre, visibilidad y categoría.</span>
          </div>
          <div className="route-card__grid">
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

            <div className="input-group">
              <label className="route-card__section-title" htmlFor="privacy-toggle">
                Visibilidad
              </label>
              <label className="route-card__toggle" id="privacy-toggle">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => onTogglePrivate(e.target.checked)}
                />
                Privada
              </label>
              <p className="route-card__helper">
                {isPrivate ? "Solo tú podrás verla" : "Se mostrará a otros usuarios"}
              </p>
            </div>
          </div>
        </div>

        <div className="route-card__section">
          <div className="route-card__section-head">
            <span className="route-card__section-title">Modo de creación</span>
            <div className="route__tabs" role="tablist" aria-label="Modo de creación de ruta">
              <button
                className={`route__tab-btn ${mode === "search" ? "active" : ""}`}
                onClick={() => onChangeMode("search")}
                aria-pressed={mode === "search"}
              >
                Buscar ubicación
              </button>
              <button
                className={`route__tab-btn ${mode === "draw" ? "active" : ""}`}
                onClick={() => onChangeMode("draw")}
                aria-pressed={mode === "draw"}
              >
                Dibujar ruta
              </button>
            </div>
          </div>

          {mode === "search" && (
            <>
              <p className="route-card__helper">
                Usa el buscador para localizar puntos y agrégalos a la lista.
              </p>
              <div className="input-group">
                <label>Ubicación</label>
                <div ref={geocoderRef} className="geocoder-container" />
              </div>

              <div className="route-card__actions">
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

              <div className="route-card__points">
                <h4>Puntos añadidos</h4>
                <ul className="route-card__points-list">
                  {searchPoints.map(([lng, lat], idx) => (
                    <li key={idx} className="route__point-row">
                      <span>{idx + 1}.</span>
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
              </div>
            </>
          )}

          {mode === "draw" && (
            <>
              <p className="route-card__helper">
                Haz clic en el mapa para agregar puntos a la ruta y verlos aquí.
              </p>
              <div className="route-card__points">
                <h4>Puntos dibujados</h4>
                <ul className="route-card__points-list">
                  {drawPoints.map(([lng, lat], idx) => (
                    <li key={idx} className="route__point-row">
                      {idx + 1}: {lng.toFixed(5)}, {lat.toFixed(5)}
                    </li>
                  ))}
                  {drawPoints.length === 0 && (
                    <li className="muted">No has añadido puntos todavía.</li>
                  )}
                </ul>
              </div>
              <div className="route-card__actions">
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
        </div>

        <div className="route-card__section">
          <div className="route-card__section-head">
            <span className="route-card__section-title">Descripción</span>
            <span className="route-card__helper">Añade contexto para quien vea tu ruta.</span>
          </div>
          <div className="input-group">
            <textarea
              id="route-desc"
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Cuenta brevemente de qué va la ruta…"
              rows={4}
              maxLength={500}
            />
            <div className="route-card__helper" aria-live="polite">
              {description.length}/500
            </div>
          </div>
        </div>
      </div>

      <div className="route-card__actions route-card__actions--footer">
        <div className="route-card__helper">Revisa que los puntos estén completos.</div>
        <button className="btn primary" onClick={onSave}>
          Guardar Ruta
        </button>
      </div>
    </div>
  );
};

export default RouteCardView;
