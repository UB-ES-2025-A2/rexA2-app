import React, { useState } from "react";
import type { Category, Mode } from "../types";

type Props = {
  mode: Mode;
  name: string;
  description: string;
  category: Category | "";
  images: { id: string; url: string; name: string; size?: number }[];
  difficulty: "" | "easy" | "medium" | "hard";
  categoryOptions?: Category[];
  errors?: Record<string, string>;
  generalError?: string;
  isSaving?: boolean;

  geocoderRef: React.RefObject<HTMLDivElement | null>;
  searchPoints: Array<[number, number]>;
  drawPoints: Array<[number, number]>;
  selectedCoord: [number, number] | null;
  nameTooLong: boolean;

  onChangeName: (v: string) => void;
  onChangeCategory: (v: Category | "") => void;
  onChangeDifficulty: (v: "" | "easy" | "medium" | "hard") => void;
  onChangeMode: (m: Mode) => void;
  onAddSearchPoint: () => void;
  onClearSearchPoints: () => void;
  onRemoveSearchPoint: (idx: number) => void;
  onResetDrawPoints?: () => void;
  onSave: () => void | Promise<void>;
  onChangeDescription: (v: string) => void;
  onSelectImages: (files: FileList | null) => void | Promise<void>;
  onRemoveImage: (id: string) => void;
};

const RouteCardView: React.FC<Props> = ({
  mode,
  name,
  category,
  images,
  difficulty,
  errors = {},
  generalError,
  isSaving = false,
  categoryOptions = [],
  geocoderRef,
  searchPoints,
  drawPoints,
  selectedCoord,
  nameTooLong,
  description,

  onChangeName,
  onChangeCategory,
  onChangeDifficulty,
  onChangeMode,
  onAddSearchPoint,
  onClearSearchPoints,
  onRemoveSearchPoint,
  onResetDrawPoints,
  onSave,
  onChangeDescription,
  onSelectImages,
  onRemoveImage,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const formatCategory = (cat: string) => {
    if (!cat) return "";
    const labels: Record<string, string> = {
      urban: "Urbana",
      gastronomia: "Gastronomia",
    };
    if (labels[cat]) return labels[cat];
    return cat
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) {
      onSelectImages(files);
      return;
    }
    const items = e.dataTransfer?.items;
    if (items && items.length) {
      const fileList = Array.from(items)
        .filter((it) => it.kind === "file")
        .map((it) => it.getAsFile())
        .filter(Boolean) as File[];
      if (fileList.length) {
        const dataTransfer = new DataTransfer();
        fileList.forEach((f) => dataTransfer.items.add(f));
        onSelectImages(dataTransfer.files);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="route-card-panel" aria-busy={isSaving}>
      <div className="route-card__header">
        <div>
          <p className="route-card__eyebrow">Crea tu recorrido</p>
          <h2 className="route__title">Crear ruta</h2>
          <p className="route-card__helper">
            Completa los datos basicos y elige si prefieres buscar puntos o dibujarlos.
          </p>
        </div>
        <span className="route-card__pill">
          {mode === "search" ? "Modo buscar" : "Modo dibujar"}
        </span>
      </div>

      {generalError && (
        <div className="route-card__alert route-card__alert--error" role="alert">
          {generalError}
        </div>
      )}

      <div className="route-card__body">
        <div className="route-card__section">
          <div className="route-card__section-head">
            <span className="route-card__section-title">Informacion rapida</span>
            <span className="route-card__helper">Nombre, tematica y visibilidad.</span>
          </div>
          <div className="route-card__grid">
            <div className={`input-group ${errors.name ? "has-error" : ""}`}>
              <label htmlFor="route-name">Nombre *</label>
              <input
                id="route-name"
                type="text"
                value={name}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="Ej: Ruta gastronomica por el centro"
              />
              {errors.name && <p className="input-error">{errors.name}</p>}
              {nameTooLong && (
                <p className="route-card__helper" style={{ color: "#dc2626" }}>
                  Maximo 30 caracteres.
                </p>
              )}
            </div>

            <div className={`input-group ${errors.category ? "has-error" : ""}`}>
              <label htmlFor="category">Categoria *</label>
              <select
                id="category"
                value={category}
                onChange={(e) => onChangeCategory(e.target.value as Category | "")}
              >
                <option value="" disabled>
                  Selecciona una categoria
                </option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatCategory(cat)}
                  </option>
                ))}
              </select>
              {errors.category && <p className="input-error">{errors.category}</p>}
            </div>

            <div className={`input-group ${errors.difficulty ? "has-error" : ""}`}>
              <label htmlFor="difficulty">Dificultad *</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => onChangeDifficulty(e.target.value as "" | "easy" | "medium" | "hard")}
              >
                <option value="" disabled>
                  Selecciona dificultad
                </option>
                <option value="easy">Facil</option>
                <option value="medium">Media</option>
                <option value="hard">Alta</option>
              </select>
              <p className="route-card__helper">
                La distancia y duracion se calcularan al guardar.
              </p>
              {errors.difficulty && <p className="input-error">{errors.difficulty}</p>}
            </div>

          </div>
        </div>

        <div className="route-card__section">
          <div className="route-card__section-head">
            <span className="route-card__section-title">Modo de creacion</span>
            <div className="route__tabs" role="tablist" aria-label="Modo de creacion de ruta">
              <button
                className={`route__tab-btn ${mode === "search" ? "active" : ""}`}
                onClick={() => onChangeMode("search")}
                aria-pressed={mode === "search"}
              >
                Buscar ubicacion
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
              <p className="route-card__helper">Localiza puntos con el buscador y sumalos.</p>
              <div className="input-group">
                <label>Ubicacion</label>
                <div ref={geocoderRef} className="geocoder-container" />
              </div>

              <div className="route-card__actions">
                <button
                  className="btn"
                  disabled={!selectedCoord}
                  onClick={onAddSearchPoint}
                  title="Anadir el resultado actual como punto"
                >
                  Anadir punto
                </button>
                <button className="btn" onClick={onClearSearchPoints} title="Vaciar lista de puntos">
                  Limpiar puntos
                </button>
              </div>

              <div className="route-card__points">
                <h4>Puntos anadidos</h4>
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
                        X
                      </button>
                    </li>
                  ))}
                  {searchPoints.length === 0 && (
                    <li className="muted">No hay puntos anadidos todavia.</li>
                  )}
                </ul>
                {errors.points && <p className="input-error">{errors.points}</p>}
              </div>
            </>
          )}

          {mode === "draw" && (
            <>
              <p className="route-card__helper">Haz clic en el mapa y revisa los puntos aqui.</p>
              <div className="route-card__points">
                <h4>Puntos dibujados</h4>
                <ul className="route-card__points-list">
                  {drawPoints.map(([lng, lat], idx) => (
                    <li key={idx} className="route__point-row">
                      {idx + 1}: {lng.toFixed(5)}, {lat.toFixed(5)}
                    </li>
                  ))}
                  {drawPoints.length === 0 && (
                    <li className="muted">No has anadido puntos todavia.</li>
                  )}
                </ul>
                {errors.points && <p className="input-error">{errors.points}</p>}
              </div>
              <div className="route-card__actions">
                {onResetDrawPoints && (
                  <button className="btn" onClick={onResetDrawPoints} title="Borrar puntos dibujados">
                    Reiniciar puntos
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="route-card__section">
          <div className="route-card__section-head">
            <span className="route-card__section-title">Imagenes (opcional)</span>
            <span className="route-card__helper">Hasta 10 imagenes · max 2 MB · Opcional</span>
          </div>
          <div
            className={`route-card__images ${isDragging ? "is-dragging" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <label className="btn" htmlFor="route-images-input">
              Seleccionar imagenes
            </label>
            <input
              id="route-images-input"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                onSelectImages(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="route-card__dropzone-hint">
              <strong>Arrastra y suelta</strong> o usa el boton superior.
              <span>PNG / JPG / WEBP · max 2 MB</span>
            </div>
            {errors.images && <p className="input-error">{errors.images}</p>}
            {images.length === 0 ? (
              <p className="muted">No has anadido imagenes.</p>
            ) : (
              <div className="route-card__image-grid">
                {images.map((img) => (
                  <div key={img.id} className="route-card__image-item">
                    <button
                      type="button"
                      className="route-card__image-remove"
                      onClick={() => onRemoveImage(img.id)}
                      title="Eliminar imagen"
                    >
                      X
                    </button>
                    <img src={img.url} alt={img.name} loading="lazy" />
                    <div className="route-card__image-meta">
                      <span title={img.name}>{img.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="route-card__section">
          <div className="route-card__section-head">
            <span className="route-card__section-title">Descripcion</span>
            <span className="route-card__helper">Cuenta en una frase de que va.</span>
          </div>
          <div className={`input-group ${errors.description ? "has-error" : ""}`}>
            <textarea
              id="route-desc"
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Cuenta brevemente de que va la ruta"
              rows={4}
              maxLength={500}
            />
            <div className="route-card__helper" aria-live="polite">
              {description.length}/500
            </div>
            {errors.description && <p className="input-error">{errors.description}</p>}
          </div>
        </div>
      </div>

      <div className="route-card__actions route-card__actions--footer">
        <div className="route-card__helper">Revisa que los puntos esten completos.</div>
        <button className="btn primary" onClick={onSave} disabled={isSaving} aria-live="polite">
          {isSaving ? "Guardando..." : "Guardar ruta"}
        </button>
      </div>
    </div >
  );
};

export default RouteCardView;
