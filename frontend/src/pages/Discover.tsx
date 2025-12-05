import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Discover.css";

type DiscoverRoute = {
  id: string;
  name: string;
  country?: string | null;
  theme?: string | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  images?: string[];
};

type CountryBlock = { country: string; routes: DiscoverRoute[] };
type ThemeBlock = { theme: string; routes: DiscoverRoute[] };

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/$/, "");

const CATEGORY_LABELS: Record<string, string> = {
  gastronomia: "Gastronomía",
  naturaleza: "Naturaleza",
  aventura: "Aventura",
  cultura: "Cultura",
  deporte: "Deporte",
  historia: "Historia",
  urban: "Urbana",
  entretenimiento: "Entretenimiento",
  otros: "Otros",
};

const CATEGORY_ORDER = [
  "aventura",
  "cultura",
  "deporte",
  "entretenimiento",
  "gastronomia",
  "historia",
  "naturaleza",
  "otros",
  "urban",
];

const THEME_GRADIENTS: Record<string, string> = {
  costa: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
  montana: "linear-gradient(135deg, #4f46e5, #22c55e)",
  ciudad: "linear-gradient(135deg, #f43f5e, #fb923c)",
  desierto: "linear-gradient(135deg, #f97316, #facc15)",
  otros: "linear-gradient(135deg, #6366f1, #a855f7)",
};

const formatDistance = (distanceKm?: number | null) => {
  if (distanceKm == null) return "Distancia N/D";
  return `${distanceKm.toFixed(1)} km`;
};

const formatDuration = (minutes?: number | null) => {
  if (minutes == null) return "Duración N/D";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours} h ${mins} min` : `${hours} h`;
};

const normalizeTheme = (theme?: string | null) => {
  if (!theme) return "otros";
  return theme.toLowerCase();
};

const normalizeCategory = normalizeTheme;

const coverStyle = (route: DiscoverRoute) => {
  const img = route.images?.[0];
  if (img) {
    return {
      backgroundImage: `url(${img})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: THEME_GRADIENTS[normalizeTheme(route.theme)] || THEME_GRADIENTS.otros };
};

export default function Discover() {
  const [country, setCountry] = useState<string>("Todos");
  const [theme, setTheme] = useState<string>("todos");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [countryBlocks, setCountryBlocks] = useState<CountryBlock[]>([]);
  const [themeBlocks, setThemeBlocks] = useState<ThemeBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("discover-html");
    document.body.classList.add("discover-body");
    return () => {
      document.documentElement.classList.remove("discover-html");
      document.body.classList.remove("discover-body");
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchDiscover() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (country !== "Todos") params.set("country", country);
        if (theme !== "todos") params.set("theme", theme);

        const query = params.toString() ? `?${params.toString()}` : "";

        const [countriesRes, themesRes] = await Promise.all([
          fetch(`${API_BASE}/routes/discover/countries${query}`, {
            signal: controller.signal,
          }),
          fetch(`${API_BASE}/routes/discover/themes${query}`, {
            signal: controller.signal,
          }),
        ]);

        if (!countriesRes.ok) {
          throw new Error(`No se pudo cargar países (${countriesRes.status})`);
        }
        if (!themesRes.ok) {
          throw new Error(`No se pudo cargar temáticas (${themesRes.status})`);
        }

        const countriesData = (await countriesRes.json()) as CountryBlock[];
        const themesData = (await themesRes.json()) as ThemeBlock[];

        if (!controller.signal.aborted) {
          setCountryBlocks(countriesData || []);
          setThemeBlocks(themesData || []);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "No se pudo cargar descubrimiento.";
        setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchDiscover();
    return () => controller.abort();
  }, [country, theme]);

  const allRoutes = useMemo(() => {
    const fromCountries = countryBlocks.flatMap((block) => block.routes || []);
    if (fromCountries.length > 0) return fromCountries;
    return themeBlocks.flatMap((block) => block.routes || []);
  }, [countryBlocks, themeBlocks]);

  const countryOptions = useMemo(() => {
    const fromBlocks = countryBlocks.map((c) => c.country || "Desconocido");
    const fromThemes = themeBlocks.flatMap((t) =>
      (t.routes || []).map((r) => r.country || "Desconocido")
    );
    const unique = Array.from(new Set([...fromBlocks, ...fromThemes]));
    return ["Todos", ...unique];
  }, [countryBlocks, themeBlocks]);

  const themeOptions = useMemo(() => {
    return ["todos", ...CATEGORY_ORDER];
  }, []);

  const filteredRoutes = useMemo(
    () =>
      allRoutes.filter((route) => {
        const routeCountry = route.country || "Desconocido";
        const routeTheme = normalizeTheme(route.theme);
        if (country !== "Todos" && routeCountry !== country) return false;
        if (theme !== "todos" && routeTheme !== theme) return false;
        return true;
      }),
    [allRoutes, country, theme]
  );

  const countryGroups = useMemo(() => {
    if (countryBlocks.length === 0) return [];
    return countryBlocks
      .map((block) => ({
        country: block.country || "Desconocido",
        routes: (block.routes || []).filter((route) => {
          const routeTheme = normalizeTheme(route.theme);
          if (country !== "Todos" && block.country !== country) return false;
          if (theme !== "todos" && routeTheme !== theme) return false;
          return true;
        }),
      }))
      .filter((block) => block.routes.length > 0);
  }, [countryBlocks, country, theme]);

  const themedCollections = useMemo(
    () =>
      CATEGORY_ORDER.map((key) => {
        const label = CATEGORY_LABELS[key] || key;
        const block = themeBlocks.find(
          (b) => normalizeCategory(b.theme) === key
        );
        const routes = (block?.routes || [])
          .filter((route) => {
            const routeCountry = route.country || "Desconocido";
            const routeTheme = normalizeCategory(route.theme);
            if (country !== "Todos" && routeCountry !== country) return false;
            if (theme !== "todos" && routeTheme !== theme) return false;
            return true;
          })
          .slice(0, 10);
        return { key, label, helper: label, routes };
      }).filter((option) => option.routes.length > 0),
    [themeBlocks, country, theme]
  );

  return (
    <div className="discover">
      <header className="primary-header">
        <div className="header__start">
          <Link to="/descubrir" className="brand" aria-label="Volver a descubrir">
            REX
          </Link>
          <nav className="main-nav" aria-label="Navegación principal">
            <NavLink
              to="/descubrir"
              className={({ isActive }) =>
                `main-nav__link ${isActive ? "active" : ""}`
              }
            >
              Descubrir
            </NavLink>
            <NavLink
              to="/mapa"
              end
              className={({ isActive }) =>
                `main-nav__link ${isActive ? "active" : ""}`
              }
            >
              Mapa
            </NavLink>
          </nav>
        </div>

        <div className="header__search">
          <div className="discover__hero-chip">Rutas curadas para inspirarte</div>
        </div>

        <div className="header__cta">
          <button className="pill-btn" onClick={() => navigate("/mapa")}>
            Ver mapa
          </button>
          <div className="profile-menu-container">
            <button
              className="profile-menu-btn"
              onClick={() => setProfileMenuOpen((v) => !v)}
              aria-label="Perfil"
              aria-haspopup={token ? "menu" : undefined}
              aria-expanded={token ? profileMenuOpen : undefined}
            >
              <span>👤</span>
            </button>
            <div
              className={`profile-menu ${profileMenuOpen ? "open" : ""}`}
              role="menu"
              aria-label="Profile menu"
            >
              {user || token ? (
                <>
                  <Link
                    className="profile-menu__item"
                    role="menuitem"
                    to="/perfil"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Mi perfil
                  </Link>
                  <button
                    className="profile-menu__item"
                    role="menuitem"
                    onClick={() => {
                      logout();
                      setProfileMenuOpen(false);
                    }}
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="profile-menu__item"
                    role="menuitem"
                    onClick={() => {
                      navigate("/mapa", { state: { authMode: "login" } });
                      setProfileMenuOpen(false);
                    }}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    className="profile-menu__item"
                    role="menuitem"
                    onClick={() => {
                      navigate("/mapa", { state: { authMode: "signup" } });
                      setProfileMenuOpen(false);
                    }}
                  >
                    Crear cuenta
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="discover__main">
        <section className="discover-hero">
          <div className="discover-hero__copy">
            <p className="eyebrow">Explorar</p>
            <h1>Descubre rutas como si ya estuvieras allí</h1>
            <p className="lead">
              Explora rutas destacadas por país o temática, con el look & feel de
              un catálogo cuidadosamente curado al estilo Airbnb.
            </p>
            <div className="hero-badges">
              <span>Fotos que inspiran</span>
              <span>Duración estimada</span>
              <span>Valoración media</span>
            </div>
            <div className="hero-actions">
              <button className="pill-btn" onClick={() => setTheme("todos")}>
                Mostrar todo
              </button>
              <button
                className="ghost-btn"
                onClick={() => setTheme("costa")}
              >
                Saltar a costa
              </button>
            </div>
          </div>
          <div className="discover-hero__panel">
            <div className="panel-card">
              <div className="panel-card__title">
                <span className="eyebrow">Contexto</span>
                <h3>Elige dónde empezar</h3>
              </div>
              <div className="panel-card__chips">
                {countryOptions.slice(1, 4).map((c) => (
                  <button
                    key={c}
                    className={`filter-chip ${country === c ? "active" : ""}`}
                    onClick={() => setCountry(c)}
                    disabled={loading}
                  >
                    {c}
                  </button>
                ))}
                <button
                  className={`filter-chip subtle ${country === "Todos" ? "active" : ""}`}
                  onClick={() => setCountry("Todos")}
                  disabled={loading}
                >
                  Cualquier destino
                </button>
              </div>
              <div className="panel-card__footer">
                Las colecciones se adaptan al país que selecciones.
              </div>
            </div>
          </div>
        </section>

        <section className="filters">
          <div className="filters__group">
            <span className="label">País o región</span>
            <div className="filters__chips">
              {countryOptions.map((c) => (
                <button
                  key={c}
                  className={`filter-chip ${country === c ? "active" : ""}`}
                  onClick={() => setCountry(c)}
                  disabled={loading}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="filters__group">
            <span className="label">Colección temática</span>
            <div className="filters__chips">
              <button
                className={`filter-chip ${theme === "todos" ? "active" : ""}`}
                onClick={() => setTheme("todos")}
                disabled={loading}
              >
                Todas
              </button>
              {themeOptions
                .filter((t) => t !== "todos")
                .map((option) => (
                <button
                  key={option}
                  className={`filter-chip ${theme === option ? "active" : ""}`}
                  onClick={() => setTheme(option)}
                  disabled={loading}
                >
                  {CATEGORY_LABELS[option] || option}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="featured">
          <div className="section-head">
            <div>
              <p className="eyebrow">Rutas destacadas</p>
              <h2>Te llevamos de viaje en un vistazo</h2>
              <p className="muted">
                Elige una ruta para saltar al mapa y seguir explorándola en detalle.
              </p>
            </div>
            <span className="pill muted">
              {loading ? "Cargando..." : `${filteredRoutes.length} resultados`}
            </span>
          </div>

          {loading ? (
            <div className="empty">
              <p className="muted">Cargando rutas destacadas...</p>
            </div>
          ) : error ? (
            <div className="empty">
              <p className="muted">{error}</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="empty">
              <p className="muted">
                No hay rutas en esta combinación todavía. Prueba otro país o
                temática.
              </p>
            </div>
          ) : (
            <div className="discover-grid">
              {filteredRoutes.slice(0, 9).map((route) => (
                <button
                  key={route.id}
                  className="discover-card"
                  onClick={() =>
                    navigate(`/routes/${route.id}`, {
                      state: { fallbackRoute: route },
                    })
                  }
                >
                  <div
                    className="discover-card__cover"
                    style={coverStyle(route)}
                  >
                    <span className="pill">{route.country || "Desconocido"}</span>
                    <span className="pill muted">{normalizeTheme(route.theme)}</span>
                  </div>
                  <div className="discover-card__body">
                    <div className="discover-card__title">
                      <h3>{route.name}</h3>
                      <p>{route.country || "Ruta destacada"}</p>
                    </div>
                    <div className="discover-card__meta">
                      <span>{formatDistance(route.distance_km)}</span>
                      <span>{formatDuration(route.duration_minutes)}</span>
                      <span>
                        ⭐ {route.rating != null ? route.rating.toFixed(1) : "N/D"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="country-sections">
          <div className="section-head">
            <div>
              <p className="eyebrow">País o región</p>
              <h2>Rutas seleccionadas por destino</h2>
              <p className="muted">
                Bloques diferenciados con entre 5 y 10 rutas para cada país destacado.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty">
              <p className="muted">Cargando rutas por país...</p>
            </div>
          ) : error ? (
            <div className="empty">
              <p className="muted">{error}</p>
            </div>
          ) : countryGroups.length === 0 ? (
            <div className="empty">
              <p className="muted">No hay rutas disponibles para este país todavía.</p>
            </div>
          ) : (
            <div className="country-blocks">
              {countryGroups.map((group) => (
                <div className="country-block" key={group.country}>
                  <div className="country-block__header">
                    <div>
                      <p className="eyebrow">Destino</p>
                      <h3>{group.country}</h3>
                    </div>
                    <span className="pill muted">
                      {group.routes.length} rutas destacadas
                    </span>
                  </div>

                  {group.routes.length === 0 ? (
                    <div className="empty">
                      <p className="muted">No hay rutas disponibles.</p>
                    </div>
                  ) : (
                    <div className="country-block__grid">
                      {group.routes.map((route) => (
                        <button
                          key={route.id}
                          className="country-tile"
                          onClick={() =>
                            navigate(`/routes/${route.id}`, {
                              state: { fallbackRoute: route },
                            })
                          }
                        >
                          <div
                            className="country-tile__cover"
                            style={coverStyle(route)}
                          ></div>
                          <div className="country-tile__body">
                            <div>
                              <strong>{route.name}</strong>
                              <p className="muted">
                                {route.country || "Ruta destacada"}
                              </p>
                            </div>
                            <div className="country-tile__meta">
                              <span>{formatDistance(route.distance_km)}</span>
                              <span>{formatDuration(route.duration_minutes)}</span>
                              <span>
                                ⭐ {route.rating != null ? route.rating.toFixed(1) : "N/D"}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="collections">
          <div className="section-head">
            <div>
              <p className="eyebrow">Colecciones temáticas</p>
              <h2>Explora por estado de ánimo</h2>
            </div>
          </div>

          {loading ? (
            <div className="empty">
              <p className="muted">Cargando colecciones...</p>
            </div>
          ) : error ? (
            <div className="empty">
              <p className="muted">{error}</p>
            </div>
          ) : (
            <div className="collections__grid">
              {themedCollections.map((collection) => (
                <div className="collection-card" key={collection.key}>
                  <div className="collection-card__head">
                    <div>
                      <p className="eyebrow">{collection.label}</p>
                      <h3>{collection.helper}</h3>
                    </div>
                    <span className="pill muted">
                      {collection.routes.length} rutas
                    </span>
                  </div>
                  {collection.routes.length === 0 ? (
                    <div className="empty">
                      <p className="muted">
                        No hay rutas disponibles en esta categoría.
                      </p>
                    </div>
                  ) : (
                    <div className="collection-card__routes">
                      {collection.routes.map((route) => (
                        <button
                          key={route.id}
                          className="collection-card__route"
                          onClick={() =>
                            navigate(`/routes/${route.id}`, {
                              state: { fallbackRoute: route },
                            })
                          }
                        >
                          <div
                            className="collection-card__thumb"
                            style={coverStyle(route)}
                          ></div>
                          <div className="collection-card__copy">
                            <strong>{route.name}</strong>
                            <span className="muted">{route.country || "Ruta destacada"}</span>
                          </div>
                          <span className="pill mini">
                            ⭐ {route.rating != null ? route.rating.toFixed(1) : "N/D"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {themedCollections.every((collection) => collection.routes.length === 0) ? (
                <div className="empty">
                  <p className="muted">No hay colecciones disponibles para este país todavía.</p>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
