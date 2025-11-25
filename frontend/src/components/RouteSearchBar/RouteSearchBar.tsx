import React, { useState, useMemo, useEffect } from "react";
import "../../styles/RouteSearchBar.css";

interface Route {
  id: string;
  name: string;
  description: string;
  category: string;
  points: Array<[number, number]>;
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

interface RouteSearchBarProps {
  routes: Route[];
  mode: SearchScope;
  query: string;
  onQueryChange: (query: string) => void;
  onApplyFilters?: (filters: { category: string; pointsFilter: string }) => void;
  isLoading?: boolean;
}

const RouteSearchBar: React.FC<RouteSearchBarProps> = ({
  routes,
  mode,
  query,
  onQueryChange,
  onApplyFilters,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [pointsFilter, setPointsFilter] = useState<string>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(routes.map((r) => r.category));
    return Array.from(cats).sort();
  }, [routes]);

  const handleFilterClick = () => {
    setShowFilterModal(!showFilterModal);
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
    if (onApplyFilters) {
      onApplyFilters({
        category: selectedCategory,
        pointsFilter: pointsFilter,
      });
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setPointsFilter("all");
    if (onApplyFilters) {
      onApplyFilters({
        category: "all",
        pointsFilter: "all",
      });
    }
  };

  const handleCloseModal = () => {
    setShowFilterModal(false);
  };

  const hasActiveFilters =
    selectedCategory !== "all" || pointsFilter !== "all";

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
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
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
                      value={pointsFilter}
                      onChange={(e) => setPointsFilter(e.target.value)}
                      className="filter-select-modal"
                    >
                      <option value="all">Todos los puntos</option>
                      <option value="few">Pocas (1-5 puntos)</option>
                      <option value="medium">Media (6-15 puntos)</option>
                      <option value="many">Muchas (+15 puntos)</option>
                    </select>
                  </div>

                  <div className="filter-modal-actions">
                    <button
                      className="filter-modal-btn reset"
                      onClick={handleResetFilters}
                    >
                      Limpiar
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
