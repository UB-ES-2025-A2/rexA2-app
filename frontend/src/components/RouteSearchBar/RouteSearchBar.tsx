import React, { useState, useMemo, useEffect } from "react";
import "../../styles/RouteSearchBar.css";

interface Route {
  id: string;
  name: string;
  description: string;
  category: string;
  points: Array<[number, number]>;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  difficulty?: string;
  routeType?: string;
  theme?: string;
  visibility: boolean;
  is_owner?: boolean;
  ownerName?: string;
  ownerUsername?: string;
  username?: string;
  email?: string;
  owner_id?: string | number;
  user_id?: string | number;
  ownerId?: string | number;
  userId?: string | number;
  user?: { id?: string | number; username?: string; name?: string; email?: string };
}

type SearchScope = "routes" | "users";

type DistanceFilter = "all" | "lt5" | "5to10" | "10to20" | "gt20";
type DurationFilter = "all" | "lt1" | "1to3" | "3to6" | "gt6";
type DifficultyFilter = "all" | "easy" | "medium" | "hard";
type RouteTypeFilter = "all" | "loop" | "pointToPoint" | "outAndBack";
type ThemeFilter = "all" | "nature" | "urban" | "cultural";

type FiltersState = {
  category: string;
  pointsFilter: string;
  distance: DistanceFilter;
  duration: DurationFilter;
  difficulty: DifficultyFilter;
  routeType: RouteTypeFilter;
  theme: ThemeFilter;
};

const DEFAULT_FILTERS: FiltersState = {
  category: "all",
  pointsFilter: "all",
  distance: "all",
  duration: "all",
  difficulty: "all",
  routeType: "all",
  theme: "all",
};

interface RouteSearchBarProps {
  routes: Route[];
  mode: SearchScope;
  query: string;
  onQueryChange: (query: string) => void;
  onApplyFilters?: (filters: FiltersState) => void;
  filters?: FiltersState;
  isLoading?: boolean;
}

const RouteSearchBar: React.FC<RouteSearchBarProps> = ({
  routes,
  mode,
  query,
  onQueryChange,
  onApplyFilters,
  filters = DEFAULT_FILTERS,
  isLoading = false,
}) => {
  const [localFilters, setLocalFilters] = useState<FiltersState>(filters);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(routes.map((r) => r.category));
    return Array.from(cats).sort();
  }, [routes]);

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
  };

  const hasActiveFilters =
    localFilters.category !== "all" ||
    localFilters.pointsFilter !== "all" ||
    localFilters.distance !== "all" ||
    localFilters.duration !== "all" ||
    localFilters.difficulty !== "all" ||
    localFilters.routeType !== "all" ||
    localFilters.theme !== "all";

  useEffect(() => {
    if (mode !== "routes") {
      setShowFilterModal(false);
    }
  }, [mode]);

  const placeholder =
    mode === "users"
      ? "Buscar usuarios por nombre, username o email..."
      : "Buscar rutas por nombre, creador o descripción...";

  return (
    <div className="route-search-bar">
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
                onClick={handleCloseModal}
              >
                <div
                  className="filter-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="filter-modal-header">
                    <h3>Explorar por filtros</h3>
                    <button
                      className="filter-modal-close"
                      onClick={handleCloseModal}
                      title="Cerrar"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <div className="filter-section">
                    <label className="filter-label">Categoria</label>
                    <select
                      value={localFilters.category}
                      onChange={(e) => updateFilters({ category: e.target.value })}
                      className="filter-select-modal"
                    >
                      <option value="all">Todas las categorias</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-section">
                    <label className="filter-label">Numero de puntos</label>
                    <select
                      value={localFilters.pointsFilter}
                      onChange={(e) =>
                        updateFilters({ pointsFilter: e.target.value })
                      }
                      className="filter-select-modal"
                    >
                      <option value="all">Todos los puntos</option>
                      <option value="few">Pocas (1-5 puntos)</option>
                      <option value="medium">Media (6-15 puntos)</option>
                      <option value="many">Muchas (+15 puntos)</option>
                    </select>
                  </div>

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
                          className={`filter-chip ${
                            localFilters.distance === option.value ? "active" : ""
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
                          className={`filter-chip ${
                            localFilters.duration === option.value ? "active" : ""
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
                          className={`filter-chip ${
                            localFilters.difficulty === option.value ? "active" : ""
                          }`}
                          onClick={() => updateFilters({ difficulty: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="filter-section">
                    <div className="filter-label">Tipo de ruta (opcional)</div>
                    <div className="filter-chip-group">
                      {[
                        { label: "Todas", value: "all" as RouteTypeFilter },
                        { label: "Circular", value: "loop" as RouteTypeFilter },
                        {
                          label: "Punto a punto",
                          value: "pointToPoint" as RouteTypeFilter,
                        },
                        {
                          label: "Ida y vuelta",
                          value: "outAndBack" as RouteTypeFilter,
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          className={`filter-chip ${
                            localFilters.routeType === option.value ? "active" : ""
                          }`}
                          onClick={() => updateFilters({ routeType: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="filter-section">
                    <div className="filter-label">Categoría temática</div>
                    <div className="filter-chip-group">
                      {[
                        { label: "Todas", value: "all" as ThemeFilter },
                        { label: "Naturaleza", value: "nature" as ThemeFilter },
                        { label: "Urbana", value: "urban" as ThemeFilter },
                        { label: "Cultural", value: "cultural" as ThemeFilter },
                      ].map((option) => (
                        <button
                          key={option.value}
                          className={`filter-chip ${
                            localFilters.theme === option.value ? "active" : ""
                          }`}
                          onClick={() => updateFilters({ theme: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
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
