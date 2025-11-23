import React, { useState, useMemo } from "react";
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
}

interface RouteSearchBarProps {
  routes: Route[];
  onRouteSelect: (route: Route) => void;
  onApplyFilters?: (filters: { category: string; pointsFilter: string }) => void;
}

const RouteSearchBar: React.FC<RouteSearchBarProps> = ({
  routes,
  onRouteSelect,
  onApplyFilters,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [pointsFilter, setPointsFilter] = useState<string>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(routes.map((r) => r.category));
    return Array.from(cats).sort();
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return routes.filter((route) => {
      const owner =
        route.ownerUsername ||
        route.ownerName ||
        route.description ||
        route.name;
      const matchesSearch =
        normalizedQuery === "" ||
        route.name.toLowerCase().includes(normalizedQuery) ||
        owner.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        selectedCategory === "all" || route.category === selectedCategory;

      const pointCount = route.points.length;
      let matchesPoints = true;
      if (pointsFilter !== "all") {
        if (pointsFilter === "few") matchesPoints = pointCount <= 5;
        if (pointsFilter === "medium")
          matchesPoints = pointCount > 5 && pointCount <= 15;
        if (pointsFilter === "many") matchesPoints = pointCount > 15;
      }

      return matchesSearch && matchesCategory && matchesPoints;
    });
  }, [routes, searchQuery, selectedCategory, pointsFilter]);

  const handleRouteClick = (route: Route) => {
    onRouteSelect(route);
    setSearchQuery("");
  };

  const handleFilterClick = () => {
    setShowFilterModal(!showFilterModal);
  };

  const handleApplyFilters = () => {
    setHasAppliedFilters(true);
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
    setHasAppliedFilters(false);
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
              placeholder="Buscar ruta o usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                className="loading"
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
                className="magnifier"
              >
                <path d="M484.1,454.796l-110.5-110.6c29.8-36.3,47.6-82.8,47.6-133.4c0-116.3-94.3-210.6-210.6-210.6S0,94.496,0,210.796   s94.3,210.6,210.6,210.6c50.8,0,97.4-18,133.8-48l110.5,110.5c12.9,11.8,25,4.2,29.2,0C492.5,475.596,492.5,463.096,484.1,454.796z    M41.1,210.796c0-93.6,75.9-169.5,169.5-169.5s169.6,75.9,169.6,169.5s-75.9,169.5-169.5,169.5S41.1,304.396,41.1,210.796z" />
              </svg>
            </div>
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

            {showFilterModal && (
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

            {searchQuery && (
              <div className="search-results">
                <header className="result-header simple">
                  <div className="result-title">
                    Resultados{" "}
                    {filteredRoutes.length > 0 &&
                      `(${filteredRoutes.length})`}
                  </div>
                  {hasAppliedFilters && (
                    <span className="result-filters-pill">Filtros activos</span>
                  )}
                </header>

                <div className="result-content-header two-cols">
                  <div style={{ "--i": 1 } as React.CSSProperties}>
                    Ruta
                  </div>
                  <div style={{ "--i": 2 } as React.CSSProperties}>
                    Usuario
                  </div>
                </div>

                <div className="result-content">
                  {filteredRoutes.length === 0 ? (
                    <div className="no-results">
                      <svg
                        className="no-results-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <p>
                        {hasAppliedFilters
                          ? "No hay rutas que coincidan con los filtros"
                          : "No se encontraron rutas"}
                      </p>
                    </div>
                  ) : (
                    filteredRoutes.slice(0, 8).map((route, index) => (
                      <button
                        key={route.id}
                        className="result-item"
                        onClick={() => handleRouteClick(route)}
                        style={{ "--i": index + 1 } as React.CSSProperties}
                      >
                        <div>{route.name}</div>
                        <div>
                          {route.ownerName ||
                            route.ownerUsername ||
                            "Usuario desconocido"}
                        </div>
                      </button>
                    ))
                  )}
                  <div className="lava" />
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
