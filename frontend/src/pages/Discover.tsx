import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Discover.css";

type DiscoverRoute = {
  id: string;
  name: string;
  country?: string | null;
  country_name?: string | null;
  country_code?: string | null;
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
  return {
    background:
      THEME_GRADIENTS[normalizeTheme(route.theme)] || THEME_GRADIENTS.otros,
  };
};

export default function Discover() {
  const [country, setCountry] = useState<string>("Todos");
  const [theme, setTheme] = useState<string>("todos");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [countryBlocks, setCountryBlocks] = useState<CountryBlock[]>([]);
  const [themeBlocks, setThemeBlocks] = useState<ThemeBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const PREFERRED_COUNTRIES = useMemo(
    () => [
      "Todos",
      "España",
      "Francia",
      "Portugal",
      "Italia",
      "Chile",
      "Estados Unidos",
      "Canadá",
    ],
    []
  );
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [durationFilter, setDurationFilter] = useState<
    "any" | "lt1" | "1to3" | "3to6" | "gt6"
  >("any");

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
          err instanceof Error
            ? err.message
            : "No se pudo cargar descubrimiento.";
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
    const fromBlocks = countryBlocks.map(
      (c) => c.country || (c as any).country_name || "Desconocido"
    );
    const fromThemes = themeBlocks.flatMap((t) =>
      (t.routes || []).map(
        (r) => r.country_name || r.country || r.country_code || "Desconocido"
      )
    );
    const unique = Array.from(
      new Set([...PREFERRED_COUNTRIES, ...fromBlocks, ...fromThemes])
    );
    // Garantiza que "Todos" esté en primer lugar
    const withoutAll = unique.filter((c) => c !== "Todos");
    return ["Todos", ...withoutAll];
  }, [countryBlocks, themeBlocks, PREFERRED_COUNTRIES]);

  const themeOptions = useMemo(() => {
    return ["todos", ...CATEGORY_ORDER];
  }, []);

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
            const routeCountry =
              route.country_name ||
              route.country ||
              route.country_code ||
              "Desconocido";
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
          <Link
            to="/descubrir"
            className="brand"
            aria-label="Volver a descubrir"
          >
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

        <div className="header__search"></div>

        <div className="header__cta">
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
              Explora rutas destacadas por país o temática, con el look & feel
              de un catálogo cuidadosamente curado al estilo Airbnb.
            </p>
          </div>
          <div className="discover-hero__panel">
            <div className="panel-card">
              <div className="panel-card__title">
                <span className="eyebrow">Contexto</span>
                <h3>Elige dónde empezar</h3>
              </div>
              <label className="label" htmlFor="country-select">
                País o región
              </label>
              <select
                id="country-select"
                className="country-select"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={loading}
              >
                {countryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="panel-card__chips"></div>
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
                    className={`filter-chip ${
                      theme === option ? "active" : ""
                    }`}
                    onClick={() => setTheme(option)}
                    disabled={loading}
                  >
                    {CATEGORY_LABELS[option] || option}
                  </button>
                ))}
            </div>
          </div>

          <div className="filters__group">
            <span className="label">Valoración media</span>
            <div className="filters__chips">
              {[0, 4, 4.5, 4.8].map((threshold) => (
                <button
                  key={threshold}
                  className={`filter-chip ${
                    ratingFilter === threshold ? "active" : ""
                  }`}
                  onClick={() => setRatingFilter(threshold)}
                  disabled={loading}
                >
                  {threshold === 0 ? "Cualquier rating" : `⭐ ${threshold}+`}
                </button>
              ))}
            </div>
          </div>

          <div className="filters__group">
            <span className="label">Duración estimada</span>
            <div className="filters__chips">
              {[
                { key: "any", label: "Cualquiera" },
                { key: "lt1", label: "< 1h" },
                { key: "1to3", label: "1–3h" },
                { key: "3to6", label: "3–6h" },
                { key: "gt6", label: ">6h" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={`filter-chip ${
                    durationFilter === opt.key ? "active" : ""
                  }`}
                  onClick={() => setDurationFilter(opt.key as any)}
                  disabled={loading}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="country-sections">
          <div className="section-head">
            <div>
              <p className="eyebrow">País o región</p>
              <h2>Rutas seleccionadas por destino</h2>
              <p className="muted">
                Bloques diferenciados con entre 5 y 10 rutas para cada país
                destacado.
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
              <p className="muted">
                No hay rutas disponibles para este país todavía.
              </p>
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
                                {route.country_name ||
                                  route.country ||
                                  route.country_code ||
                                  "Ruta destacada"}
                              </p>
                            </div>
                            <div className="country-tile__meta">
                              <span>{formatDistance(route.distance_km)}</span>
                              <span>
                                {formatDuration(route.duration_minutes)}
                              </span>
                              <span>
                                ⭐{" "}
                                {route.rating != null
                                  ? route.rating.toFixed(1)
                                  : "N/D"}
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
                            <span className="muted">
                              {route.country_name ||
                                route.country ||
                                route.country_code ||
                                "Ruta destacada"}
                            </span>
                          </div>
                          <span className="pill mini">
                            ⭐{" "}
                            {route.rating != null
                              ? route.rating.toFixed(1)
                              : "N/D"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {themedCollections.every(
                (collection) => collection.routes.length === 0
              ) ? (
                <div className="empty">
                  <p className="muted">
                    No hay colecciones disponibles para este país todavía.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
