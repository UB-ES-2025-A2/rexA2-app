import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Discover.css";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import { translateErrorMessage } from "../utils/errorTranslator";

type DiscoverRoute = {
  id: string;
  name: string;
  country?: string | null;
  country_name?: string | null;
  country_code?: string | null;
  category?: string | null;
  theme?: string | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  difficulty?: string | null;
  images?: string[];
  image_urls?: string[];
  points?: Array<[number, number]> | Array<number[]>;
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

const RouteMiniMap = ({
  points,
  className,
}: {
  points: Array<[number, number]>;
  className?: string;
}) => {
  if (!points || points.length < 2)
    return (
      <div
        className={["discover-card__cover map", className]
          .filter(Boolean)
          .join(" ")}
        style={{ background: THEME_GRADIENTS.otros }}
      />
    );

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  const mapPoint = (p: [number, number]) => {
    const x = ((p[0] - minX) / width) * 100;
    const y = 100 - ((p[1] - minY) / height) * 100;
    return [x, y];
  };

  const mapped = points.map(mapPoint);
  const path = mapped.map((p) => p.join(",")).join(" ");

  return (
    <div
      className={["discover-card__cover map", className]
        .filter(Boolean)
        .join(" ")}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#d9f99d" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          rx="12"
          fill="url(#mapGrad)"
        />
        <g opacity="0.25" stroke="#94a3b8" strokeWidth="0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={(i + 1) * 20}
              y1="0"
              x2={(i + 1) * 20}
              y2="100"
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={(i + 1) * 20}
              x2="100"
              y2={(i + 1) * 20}
            />
          ))}
        </g>
        <polyline
          points={path}
          fill="none"
          stroke="#6366f1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#shadow)"
        />
        {mapped.map((p, idx) => (
          <circle
            key={idx}
            cx={p[0]}
            cy={p[1]}
            r={2.8}
            fill={idx === 0 ? "#22c55e" : "#10b981"}
            stroke="#0f172a"
            strokeWidth="0.6"
          />
        ))}
        <defs>
          <filter id="shadow" x="-10" y="-10" width="120" height="120">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1.5"
              floodColor="#312e81"
              floodOpacity="0.4"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

const formatCategoryLabel = (
  category?: string | null,
  fallback?: string | null
) => {
  const source = category || fallback || "";
  if (!source) return "Sin categoría";
  const normalized = source.toLowerCase();
  const labels: Record<string, string> = {
    gastronomia: "Gastronomía",
    "exploracion-urbana": "Exploración urbana",
    naturaleza: "Naturaleza",
    aventura: "Aventura",
    cultura: "Cultura",
    deporte: "Deporte",
    historia: "Historia",
    relajacion: "Relajación",
    entretenimiento: "Entretenimiento",
    otros: "Otros",
  };
  return labels[normalized] ?? source.charAt(0).toUpperCase() + source.slice(1);
};

const formatDifficulty = (difficulty?: string | null) => {
  if (!difficulty) return null;
  const normalized = difficulty.toLowerCase();
  const labels: Record<string, string> = {
    easy: "Fácil",
    medium: "Media",
    hard: "Alta",
  };
  return labels[normalized] ?? difficulty;
};

export default function Discover() {
  const [country, setCountry] = useState<string>("Todos");
  const [theme, setTheme] = useState<string>("todos");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
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
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setProfileMenuOpen(false);
  };

  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [durationFilter, setDurationFilter] = useState<
    "any" | "lt1" | "1to3" | "3to6" | "gt6"
  >("any");
  const [sortBy] = useState<"relevance" | "rating" | "duration">("relevance");

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
        const message = translateErrorMessage(
          err instanceof Error
            ? err.message
            : "No se pudo cargar descubrimiento."
        );
        setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchDiscover();
    return () => controller.abort();
  }, [country, theme]);

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

  const filteredRoutes = useMemo(() => {
    const base = countryBlocks.length
      ? countryBlocks.flatMap((block) => block.routes || [])
      : themeBlocks.flatMap((block) => block.routes || []);

    const filtered = base.filter((route) => {
      const routeCountry =
        route.country_name ||
        route.country ||
        route.country_code ||
        "Desconocido";
      const routeTheme = normalizeTheme(route.theme);
      if (country !== "Todos" && routeCountry !== country) return false;
      if (theme !== "todos" && routeTheme !== theme) return false;
      if (ratingFilter > 0 && (route.rating ?? 0) < ratingFilter) return false;
      const dur = route.duration_minutes ?? null;
      if (durationFilter !== "any" && dur != null) {
        if (durationFilter === "lt1" && dur >= 60) return false;
        if (durationFilter === "1to3" && (dur < 60 || dur > 180)) return false;
        if (durationFilter === "3to6" && (dur <= 180 || dur > 360))
          return false;
        if (durationFilter === "gt6" && dur <= 360) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "duration") {
        const da = a.duration_minutes ?? Number.POSITIVE_INFINITY;
        const db = b.duration_minutes ?? Number.POSITIVE_INFINITY;
        return da - db;
      }
      // relevance fallback: rating, luego duracion
      const rDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (rDiff !== 0) return rDiff;
      const da = a.duration_minutes ?? Number.POSITIVE_INFINITY;
      const db = b.duration_minutes ?? Number.POSITIVE_INFINITY;
      return da - db;
    });

    return sorted;
  }, [
    countryBlocks,
    themeBlocks,
    country,
    theme,
    ratingFilter,
    durationFilter,
    sortBy,
  ]);

  const heroStats = useMemo(() => {
    const uniqueCountries = new Set(
      filteredRoutes.map(
        (r) => r.country_name || r.country || r.country_code || "Desconocido"
      )
    );
    const uniqueThemes = new Set(
      filteredRoutes.map((r) => normalizeTheme(r.theme))
    );
    const totalKm = filteredRoutes.reduce(
      (acc, route) => acc + (route.distance_km ?? 0),
      0
    );

    return {
      routes: filteredRoutes.length,
      regions: uniqueCountries.size,
      themes: uniqueThemes.size,
      distance: Math.round(totalKm),
    };
  }, [filteredRoutes]);

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

  const handleSurprise = () => {
    if (!filteredRoutes.length) return;
    const randomRoute =
      filteredRoutes[Math.floor(Math.random() * filteredRoutes.length)];
    navigate("/mapa", {
      state: { fromDiscover: true, highlightRouteId: randomRoute.id },
    });
  };

  const renderRouteCard = (
    route: DiscoverRoute,
    variant: "default" | "compact" = "default"
  ) => {
    const points: Array<[number, number]> = Array.isArray(route.points)
      ? ((route.points as Array<any>).map((p: any) => [
        p.longitude ?? p.lng ?? p[0],
        p.latitude ?? p.lat ?? p[1],
      ]) as Array<[number, number]>)
      : [];
    const coverImage =
      (Array.isArray(route.images) && route.images[0]) ||
      (Array.isArray(route.image_urls) && route.image_urls[0]);
    const difficultyLabel = formatDifficulty(route.difficulty);
    const ratingDisplay =
      route.rating != null && Number.isFinite(route.rating)
        ? (Math.round(route.rating * 10) / 10).toFixed(1)
        : null;

    return (
      <div className={`route-preview-card discover-route-card ${variant}`}>
        <div className="route-preview-content">
          <div className="route-preview-thumb">
            {coverImage ? (
              <img
                src={coverImage}
                alt={`Imagen de ${route.name}`}
                loading="lazy"
              />
            ) : points.length > 0 ? (
              <RouteMiniMap
                points={points}
                className="route-preview-thumb__map"
              />
            ) : (
              <div
                className="route-preview-thumb__placeholder"
                aria-label="Ruta sin imagen"
              >
                <span>🗺️</span>
              </div>
            )}
          </div>

          <div className="route-preview-texts">
            <h3 className="route-preview-title">{route.name}</h3>
            <p className="route-preview-category">
              Categoría: {formatCategoryLabel(route.category, route.theme)}
            </p>
            <p className="route-preview-points">
              {(route.country_name ||
                route.country ||
                route.country_code ||
                "Origen desconocido") +
                " · " +
                `${points.length} punto${points.length === 1 ? "" : "s"}`}
            </p>

            <div className="route-preview-meta">
              {typeof route.distance_km === "number" ? (
                <span
                  className="route-preview-pill"
                  title="Distancia aproximada"
                >
                  <span className="pill-dot distance" />
                  {formatDistance(route.distance_km)}
                </span>
              ) : null}
              {route.duration_minutes != null ? (
                <span
                  className="route-preview-pill"
                  title="Duración aproximada"
                >
                  <span className="pill-dot duration" />
                  {formatDuration(route.duration_minutes)}
                </span>
              ) : null}
              {difficultyLabel ? (
                <span
                  className="route-preview-pill"
                  title="Dificultad estimada"
                >
                  <span className="pill-dot difficulty" />
                  {difficultyLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="route-preview-actions">
            {ratingDisplay ? (
              <div className="route-preview-rating-badge">
                <span className="route-preview-rating__star">★</span>
                <span className="route-preview-rating__value">
                  {ratingDisplay}
                </span>
              </div>
            ) : null}
            <button
              className="ghost-btn small"
              onClick={() =>
                navigate("/mapa", {
                  state: { fromDiscover: true, highlightRouteId: route.id },
                })
              }
            >
              Ver en mapa
            </button>
          </div>
        </div>
      </div>
    );
  };

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
                      openAuth("login");
                    }}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    className="profile-menu__item"
                    role="menuitem"
                    onClick={() => {
                      openAuth("signup");
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
          <div className="hero-overlay">
            <div className="discover-hero__copy">
              <p className="eyebrow hero-eyebrow">Experiencias REX</p>
              <h1>Explora rutas icónicas que invitan a viajar</h1>
              <p className="lead">
                Un mosaico de destinos y temáticas para despertar ganas de
                salir. Guarda tus favoritas y síguelas explorándolas en el mapa.
              </p>
              <div className="hero-actions">
                <a className="cta-btn" href="#featured">
                  Ver todas las rutas
                </a>
                <button
                  className="ghost-btn hero-ghost"
                  onClick={() => navigate("/mapa")}
                >
                  Ir al mapa
                </button>
              </div>
            </div>

            <div className="hero-controls">
              <div className="hero-row">
                <div className="hero-field">
                  <span className="label">País o región</span>
                  <select
                    id="country-select"
                    className="country-select glass-input"
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
                </div>
                <div className="hero-field">
                  <span className="label">Temática</span>
                  <div className="pill-group wrap">
                    {themeOptions.map((option) => (
                      <button
                        key={option}
                        className={`pill-chip solid ${theme === option ? "active" : ""
                          }`}
                        onClick={() => setTheme(option)}
                        disabled={loading}
                      >
                        {option === "todos" ? "Todos" : CATEGORY_LABELS[option] || option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hero-stats">
                <div className="stat-card">
                  <span className="stat-label">Rutas activas</span>
                  <span className="stat-value">{heroStats.routes ?? "-"}</span>
                  <p className="stat-hint">Destacadas y filtradas</p>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Regiones</span>
                  <span className="stat-value">{heroStats.regions ?? "-"}</span>
                  <p className="stat-hint">Destinos únicos</p>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Temáticas</span>
                  <span className="stat-value">{heroStats.themes ?? "-"}</span>
                  <p className="stat-hint">Mood para inspirarte</p>
                </div>
                <div className="stat-card">
                  <span className="stat-label">KM totales</span>
                  <span className="stat-value">
                    {heroStats.distance ?? "-"}
                  </span>
                  <p className="stat-hint">Estimados entre todas</p>
                </div>
              </div>

              <div className="hero-filter-grid">
                <div className="hero-field">
                  <span className="label">Valoración media</span>
                  <div className="pill-group wrap">
                    {[0, 4, 4.5, 4.8].map((threshold) => (
                      <button
                        key={threshold}
                        className={`pill-chip solid ${ratingFilter === threshold ? "active" : ""
                          }`}
                        onClick={() => setRatingFilter(threshold)}
                        disabled={loading}
                      >
                        {threshold === 0
                          ? "Cualquier rating"
                          : `⭐ ${threshold}+`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hero-field">
                  <span className="label">Duración estimada</span>
                  <div className="pill-group wrap">
                    {[
                      { key: "any", label: "Cualquiera" },
                      { key: "lt1", label: "< 1h" },
                      { key: "1to3", label: "1–3h" },
                      { key: "3to6", label: "3–6h" },
                      { key: "gt6", label: ">6h" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        className={`pill-chip solid ${durationFilter === opt.key ? "active" : ""
                          }`}
                        onClick={() => setDurationFilter(opt.key as any)}
                        disabled={loading}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="surprise-spot">
                  <button
                    className="cta-btn ghost-dark"
                    onClick={handleSurprise}
                    disabled={!filteredRoutes.length}
                  >
                    Sorpréndeme con una ruta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="featured" id="featured">
          <div className="section-head">
            <div>
              <p className="eyebrow">Destacadas</p>
              <h2>Rutas listas para abrir en el mapa</h2>
              <p className="muted">
                Usa los filtros para acotar y abre directamente la ficha con
                mapa.
              </p>
            </div>
            <span className="pill muted">
              {loading ? "Cargando..." : `${filteredRoutes.length} rutas`}
            </span>
          </div>

          {loading ? (
            <div className="empty">
              <p className="muted">Cargando rutas...</p>
            </div>
          ) : error ? (
            <div className="empty">
              <p className="muted">{error}</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="empty">
              <p className="muted">
                No hay rutas para esta combinación. Cambia los filtros o explora
                otro país.
              </p>
            </div>
          ) : (
            <div className="discover-grid">
              {filteredRoutes.slice(0, 12).map((route) => (
                <div key={route.id}>{renderRouteCard(route)}</div>
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
                        <div key={route.id}>{renderRouteCard(route)}</div>
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
                        <div key={route.id}>
                          {renderRouteCard(route, "compact")}
                        </div>
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
      <Modal open={authOpen} onClose={() => setAuthOpen(false)}>
        <AuthCard
          mode={authMode}
          onSwitchMode={setAuthMode}
          onSubmit={() => setAuthOpen(false)}
        />
      </Modal>
    </div>
  );
}
