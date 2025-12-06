import React, { useState, useEffect, useMemo } from "react";
import "../../styles/RouteSearchBar.css";
import { useRef } from "react";

export type SearchScope = "routes" | "users";

export type DistanceFilter = "all" | "lt5" | "5to10" | "10to20" | "gt20";
export type DurationFilter = "all" | "lt1" | "1to3" | "3to6" | "gt6";
export type DifficultyFilter = "all" | "easy" | "medium" | "hard";
export type ThemeFilter =
  | "all"
  | "nature"
  | "urban"
  | "cultural"
  | "gastronomia"
  | "exploracion-urbana"
  | "aventura"
  | "deporte"
  | "historia"
  | "entretenimiento"
  | "otros"
  | string;

export type FiltersState = {
  category: string;
  pointsFilter: string;
  distance: DistanceFilter;
  duration: DurationFilter;
  difficulty: DifficultyFilter;
  theme: ThemeFilter;
};

const DEFAULT_FILTERS: FiltersState = {
  category: "all",
  pointsFilter: "all",
  distance: "all",
  duration: "all",
  difficulty: "all",
  theme: "all",
};

interface RouteSearchBarProps {
  mode: SearchScope;
  query: string;
  onQueryChange: (query: string) => void;
  onApplyFilters?: (filters: FiltersState) => void;
  filters?: FiltersState;
  isLoading?: boolean;
  categoryOptions?: Array<{ value: string; label?: string }>;
}

const RouteSearchBar: React.FC<RouteSearchBarProps> = ({
  mode,
  query,
  onQueryChange,
  onApplyFilters,
  filters = DEFAULT_FILTERS,
  isLoading = false,
  categoryOptions,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [localFilters, setLocalFilters] = useState<FiltersState>(filters);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isCollapsing, setIsCollapsing] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilters = (partial: Partial<FiltersState>) => {
    setLocalFilters((prev) => {
      const next = { ...prev, ...partial };
      if (mode === "routes" && onApplyFilters) onApplyFilters(next);
      return next;
    });
  };

  const handleFilterClick = () => {
    setShowFilterModal(!showFilterModal);
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
    if (onApplyFilters) onApplyFilters(localFilters);
  };

  const handleResetFilters = () => {
    setLocalFilters(DEFAULT_FILTERS);
    if (onApplyFilters) onApplyFilters(DEFAULT_FILTERS);
  };

  const handleCloseModal = () => {
    setShowFilterModal(false);
    setIsCollapsing(false);
    setDragStartY(null);
    setDragOffset(0);
  };

  const hasActiveFilters =
    localFilters.category !== "all" ||
    localFilters.pointsFilter !== "all" ||
    localFilters.distance !== "all" ||
    localFilters.duration !== "all" ||
    localFilters.difficulty !== "all" ||
    localFilters.theme !== "all";

  useEffect(() => {
    if (mode !== "routes") {
      setShowFilterModal(false);
    }
  }, [mode]);

  useEffect(() => {
    const handleOutside = (ev: PointerEvent) => {
      if (!showFilterModal) return;
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        handleCloseModal();
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [showFilterModal]);

  const isDragging = dragStartY !== null;

  const handleDragStart = (clientY: number) => {
    setDragStartY(clientY);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging || dragStartY === null) return;
    const delta = clientY - dragStartY;
    const clamped = Math.max(-160, Math.min(140, delta));
    setDragOffset(clamped);
  };

  const handleDragEnd = () => {
    if (dragOffset < -90 || dragOffset > 120) {
      handleCloseModal();
    }
    setDragStartY(null);
    setDragOffset(0);
  };

  const collapseIntoBar = () => {
    setIsCollapsing(true);
    setDragOffset(-18);
    setTimeout(() => {
      handleCloseModal();
    }, 150);
  };

  const placeholder =
    mode === "users"
      ? "Buscar usuarios por nombre, username o email..."
      : "Buscar rutas por nombre, creador o descripción...";

  const computedCategoryOptions = useMemo(() => {
    const fallback = [
      { label: "Todas", value: "all" },
      { label: "Gastronomía", value: "gastronomia" },
      { label: "Naturaleza", value: "nature" },
      { label: "Aventura", value: "aventura" },
      { label: "Deporte", value: "deporte" },
      { label: "Historia", value: "historia" },
      { label: "Entretenimiento", value: "entretenimiento" },
      { label: "Urbana", value: "urban" },
      { label: "Cultural", value: "cultural" },
      { label: "Otros", value: "otros" },
    ];

    const source = categoryOptions && categoryOptions.length > 0 ? categoryOptions : fallback;
    const seen = new Set<string>();
    const result: Array<{ value: string; label?: string }> = [];
    const add = (opt: { value: string; label?: string }) => {
      const key = opt.value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(opt);
    };

    add({ label: "Todas", value: "all" });
    source.forEach(add);
    return result;
  }, [categoryOptions]);

  return (
    <div className="route-search-bar" ref={containerRef}>
      <div className="search-container">
        <div className="bg" />
        <div className="search-input-wrapper">
          <div className="search-input">
            <div className="glow left" />
            <div className="glow right" />
            <input
              type="text"
              name="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="search-input-field"
            />
            <div className="reflection" />
            <div className="icon">
              <svg
                stroke="#fff"
                viewBox="0 0 38 38"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
                className={`loading ${isLoading ? "active" : ""}`}
              >
                <g fillRule="evenodd" fill="none">
                  <g strokeWidth={3} transform="translate(1 1)">
                    <circle r={18} cy={18} cx={18} strokeOpacity=".2" />
                    <path d="M36 18c0-9.94-8.06-18-18-18" />
                  </g>
                </g>
              </svg>
              <svg
                viewBox="0 0 490.4 490.4"
                version="1.1"
                width="1em"
                height="1em"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className={`magnifier ${isLoading ? "hidden" : ""}`}
              >
                <path d="M484.1,454.796l-110.5-110.6c29.8-36.3,47.6-82.8,47.6-133.4c0-116.3-94.3-210.6-210.6-210.6S0,94.496,0,210.796   s94.3,210.6,210.6,210.6c50.8,0,97.4-18,133.8-48l110.5,110.5c12.9,11.8,25,4.2,29.2,0C492.5,475.596,492.5,463.096,484.1,454.796z    M41.1,210.796c0-93.6,75.9-169.5,169.5-169.5s169.6,75.9,169.6,169.5s-75.9,169.5-169.5,169.5S41.1,304.396,41.1,210.796z" />
              </svg>
            </div>
            {mode === "routes" && (
              <button
                className={`filter ${hasActiveFilters ? "active" : ""}`}
                title="Filtros"
                onClick={handleFilterClick}
              >
                <span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                {hasActiveFilters && <div className="filter-badge" />}
              </button>
            )}

            {showFilterModal && mode === "routes" && (
              <div
                className="filter-modal-overlay"
                onPointerMove={(e) => handleDragMove(e.clientY)}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
              >
                <div
                  className="filter-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    transform: `translateY(${dragOffset}px) scale(${isCollapsing ? 0.85 : dragOffset < 0 ? Math.max(0.9, 1 + dragOffset / 280) : 1})`,
                    opacity: isCollapsing
                      ? 0.15
                      : dragOffset !== 0
                        ? 1 - Math.min(Math.abs(dragOffset) / 320, 0.35)
                        : 1,
                    ["--drag-progress" as any]: Math.min(1, Math.max(0, -dragOffset / 120)),
                  }}
                >
                  <div className="filter-modal-header">
                    <h3>Explorar por filtros</h3>
                  </div>

                  <div className="filter-modal-body">
                    <div className="filter-section">
                      <div className="filter-label">Distancia</div>
                      <div className="filter-chip-group">
                        {[
                          { label: "Cualquiera", value: "all" as DistanceFilter },
                          { label: "<5 km", value: "lt5" as DistanceFilter },
                          { label: "5–10 km", value: "5to10" as DistanceFilter },
                          { label: "10–20 km", value: "10to20" as DistanceFilter },
                          { label: ">20 km", value: "gt20" as DistanceFilter },
                        ].map((option) => (
                          <button
                            key={option.value}
                            className={`filter-chip ${localFilters.distance === option.value ? "active" : ""
                              }`}
                            onClick={() => updateFilters({ distance: option.value })}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <div className="filter-label">Duración aproximada</div>
                      <div className="filter-chip-group">
                        {[
                          { label: "Cualquiera", value: "all" as DurationFilter },
                          { label: "<1h", value: "lt1" as DurationFilter },
                          { label: "1–3h", value: "1to3" as DurationFilter },
                          { label: "3–6h", value: "3to6" as DurationFilter },
                          { label: ">6h", value: "gt6" as DurationFilter },
                        ].map((option) => (
                          <button
                            key={option.value}
                            className={`filter-chip ${localFilters.duration === option.value ? "active" : ""
                              }`}
                            onClick={() => updateFilters({ duration: option.value })}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <div className="filter-label">Dificultad (opcional)</div>
                      <div className="filter-chip-group">
                        {[
                          { label: "Todas", value: "all" as DifficultyFilter },
                          { label: "Fácil", value: "easy" as DifficultyFilter },
                          { label: "Media", value: "medium" as DifficultyFilter },
                          { label: "Alta", value: "hard" as DifficultyFilter },
                        ].map((option) => (
                          <button
                            key={option.value}
                            className={`filter-chip ${localFilters.difficulty === option.value ? "active" : ""
                              }`}
                            onClick={() => updateFilters({ difficulty: option.value })}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="filter-section">
                      <div className="filter-label">Categoría temática</div>
                    <div className="filter-chip-group">
                      {computedCategoryOptions.map((option) => (
                          <button
                            key={option.value}
                            className={`filter-chip ${localFilters.theme === option.value ? "active" : ""
                              }`}
                          onClick={() => updateFilters({ theme: option.value as ThemeFilter })}
                          >
                          {option.label ?? option.value}
                          </button>
                        ))}
                    </div>
                  </div>
                  </div>

                  <div className="filter-modal-actions">
                    <button
                      className="filter-modal-btn reset"
                      onClick={handleResetFilters}
                    >
                      Restablecer
                    </button>
                    <button
                      className="filter-modal-btn apply"
                      onClick={handleApplyFilters}
                    >
                      Explorar
                    </button>
                  </div>

                  <div
                    className={`filter-modal-handle bottom ${isDragging ? "dragging" : ""}`}
                    onPointerDown={(e) => handleDragStart(e.clientY)}
                    onClick={collapseIntoBar}
                    role="button"
                    tabIndex={0}
                    aria-label="Cerrar filtros"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") collapseIntoBar();
                    }}
                  />
                </div>
              </div>
            )}

          </div>
          <div className="glow-outline" />
          <div className="glow-layer-bg" />
          <div className="glow-layer-1" />
          <div className="glow-layer-2" />
          <div className="glow-layer-3" />
          <div className="glow left" />
          <div className="glow right" />
        </div>
      </div>
    </div>
  );
};

export default RouteSearchBar;
