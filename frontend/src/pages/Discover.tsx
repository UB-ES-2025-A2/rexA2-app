import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Discover.css";

type DiscoverRoute = {
  id: string;
  title: string;
  location: string;
  country: string;
  theme: "costa" | "montana" | "ciudad" | "selva" | "desierto";
  distance: string;
  duration: string;
  rating: number;
  gradient: string;
  accent: string;
};

const FEATURED_ROUTES: DiscoverRoute[] = [
  // España
  {
    id: "costa-luz",
    title: "Costa de la Luz",
    location: "Cádiz, España",
    country: "España",
    theme: "costa",
    distance: "12 km",
    duration: "3 h",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
    accent: "Arena dorada y faros infinitos",
  },
  {
    id: "tramuntana",
    title: "Serra de Tramuntana",
    location: "Mallorca, España",
    country: "España",
    theme: "montana",
    distance: "18 km",
    duration: "5 h",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #4f46e5, #22c55e)",
    accent: "Miradores al Mediterráneo",
  },
  {
    id: "camino-norte",
    title: "Camino del Norte",
    location: "País Vasco, España",
    country: "España",
    theme: "costa",
    distance: "24 km",
    duration: "7 h",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    accent: "Acantilados verdes y pueblos marineros",
  },
  {
    id: "picos-europa",
    title: "Picos de Europa",
    location: "Asturias, España",
    country: "España",
    theme: "montana",
    distance: "16 km",
    duration: "5 h",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #22c55e, #0ea5e9)",
    accent: "Lagos glaciares y miradores naturales",
  },
  {
    id: "albufera",
    title: "Atardecer en la Albufera",
    location: "Valencia, España",
    country: "España",
    theme: "costa",
    distance: "9 km",
    duration: "2 h",
    rating: 4.5,
    gradient: "linear-gradient(135deg, #f97316, #facc15)",
    accent: "Arrozales y paseos en barca",
  },
  // Francia
  {
    id: "calanques-marsella",
    title: "Calanques de Marsella",
    location: "Provenza, Francia",
    country: "Francia",
    theme: "costa",
    distance: "11 km",
    duration: "3 h",
    rating: 4.6,
    gradient: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
    accent: "Aguas turquesa y acantilados de caliza",
  },
  {
    id: "chamonix",
    title: "Chamonix Panorámica",
    location: "Alpes, Francia",
    country: "Francia",
    theme: "montana",
    distance: "14 km",
    duration: "5 h",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #4f46e5, #22c55e)",
    accent: "Glaciares y vistas al Mont Blanc",
  },
  {
    id: "normandia",
    title: "Costa de Normandía",
    location: "Étretat, Francia",
    country: "Francia",
    theme: "costa",
    distance: "10 km",
    duration: "3 h",
    rating: 4.5,
    gradient: "linear-gradient(135deg, #22c55e, #14b8a6)",
    accent: "Arcos de piedra y playas infinitas",
  },
  {
    id: "loira",
    title: "Castillos del Loira",
    location: "Valle del Loira, Francia",
    country: "Francia",
    theme: "ciudad",
    distance: "28 km",
    duration: "6 h",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #f43f5e, #fb923c)",
    accent: "Viñedos y palacios renacentistas",
  },
  {
    id: "paris-sena",
    title: "Orillas del Sena",
    location: "París, Francia",
    country: "Francia",
    theme: "ciudad",
    distance: "8 km",
    duration: "2 h",
    rating: 4.4,
    gradient: "linear-gradient(135deg, #6366f1, #a855f7)",
    accent: "Museos, puentes y cafés emblemáticos",
  },
  // Italia
  {
    id: "cinque-terre",
    title: "Cinque Terre Azul",
    location: "Liguria, Italia",
    country: "Italia",
    theme: "costa",
    distance: "12 km",
    duration: "4 h",
    rating: 4.8,
    gradient: "linear-gradient(135deg, #0ea5e9, #22c55e)",
    accent: "Pueblos de colores sobre el mar",
  },
  {
    id: "dolomitas",
    title: "Dolomitas Seceda",
    location: "Tirol del Sur, Italia",
    country: "Italia",
    theme: "montana",
    distance: "15 km",
    duration: "5 h",
    rating: 4.9,
    gradient: "linear-gradient(135deg, #4f46e5, #0ea5e9)",
    accent: "Praderas alpinas y picos afilados",
  },
  {
    id: "amalfi",
    title: "Costa Amalfitana",
    location: "Campania, Italia",
    country: "Italia",
    theme: "costa",
    distance: "9 km",
    duration: "3 h",
    rating: 4.7,
    gradient: "linear-gradient(135deg, #f97316, #facc15)",
    accent: "Miradores al Tirreno y limoneros",
  },
  {
    id: "roma-nocturna",
    title: "Roma Nocturna",
    location: "Roma, Italia",
    country: "Italia",
    theme: "ciudad",
    distance: "7 km",
    duration: "2 h",
    rating: 4.5,
    gradient: "linear-gradient(135deg, #a855f7, #6366f1)",
    accent: "Fuentes, plazas y trattorias escondidas",
  },
  {
    id: "toscana",
    title: "Val d'Orcia",
    location: "Toscana, Italia",
    country: "Italia",
    theme: "montana",
    distance: "18 km",
    duration: "5 h",
    rating: 4.6,
    gradient: "linear-gradient(135deg, #22c55e, #14b8a6)",
    accent: "Colinas onduladas y cipreses infinitos",
  },
];

const THEME_OPTIONS = [
  { key: "costa", label: "Costa", helper: "Playas, acantilados y puertos" },
  { key: "montana", label: "Montaña", helper: "Cumbres, lagos y miradores" },
  { key: "ciudad", label: "Ciudades", helper: "Barrios vibrantes y cultura" },
  { key: "desierto", label: "Desierto", helper: "Dunas, salares y cielos limpios" },
];

const COUNTRIES = ["Todos", ...new Set(FEATURED_ROUTES.map((r) => r.country))];

export default function Discover() {
  const [country, setCountry] = useState<string>("Todos");
  const [theme, setTheme] = useState<string>("todos");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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

  const filteredRoutes = useMemo(
    () =>
      FEATURED_ROUTES.filter(
        (route) =>
          (country === "Todos" || route.country === country) &&
          (theme === "todos" || route.theme === theme)
      ),
    [country, theme]
  );

  const countryGroups = useMemo(() => {
    const grouped = new Map<string, DiscoverRoute[]>();
    filteredRoutes.forEach((route) => {
      const current = grouped.get(route.country) || [];
      current.push(route);
      grouped.set(route.country, current);
    });
    return Array.from(grouped.entries()).map(([countryName, routes]) => ({
      country: countryName,
      routes: routes.slice(0, 10),
    }));
  }, [filteredRoutes]);

  const themedCollections = useMemo(
    () =>
      THEME_OPTIONS.map((option) => ({
        ...option,
        routes: FEATURED_ROUTES.filter(
          (route) =>
            (country === "Todos" || route.country === country) &&
            route.theme === option.key &&
            (theme === "todos" || route.theme === theme)
        ).slice(0, 3),
      })),
    [country, theme]
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
                {COUNTRIES.slice(1, 4).map((c) => (
                  <button
                    key={c}
                    className={`filter-chip ${country === c ? "active" : ""}`}
                    onClick={() => setCountry(c)}
                  >
                    {c}
                  </button>
                ))}
                <button
                  className={`filter-chip subtle ${country === "Todos" ? "active" : ""}`}
                  onClick={() => setCountry("Todos")}
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
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  className={`filter-chip ${country === c ? "active" : ""}`}
                  onClick={() => setCountry(c)}
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
              >
                Todas
              </button>
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className={`filter-chip ${theme === option.key ? "active" : ""}`}
                  onClick={() => setTheme(option.key)}
                >
                  {option.label}
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
              {filteredRoutes.length} resultados
            </span>
          </div>

          {filteredRoutes.length === 0 ? (
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
                    navigate("/mapa", {
                      state: { fromDiscover: true, highlightRouteId: route.id },
                    })
                  }
                >
                  <div
                    className="discover-card__cover"
                    style={{ background: route.gradient }}
                  >
                    <span className="pill">{route.country}</span>
                    <span className="pill muted">{route.theme}</span>
                  </div>
                  <div className="discover-card__body">
                    <div className="discover-card__title">
                      <h3>{route.title}</h3>
                      <p>{route.location}</p>
                    </div>
                    <p className="muted">{route.accent}</p>
                    <div className="discover-card__meta">
                      <span>{route.distance}</span>
                      <span>{route.duration}</span>
                      <span>⭐ {route.rating.toFixed(1)}</span>
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

          {countryGroups.length === 0 ? (
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
                            navigate("/mapa", {
                              state: {
                                fromDiscover: true,
                                highlightRouteId: route.id,
                              },
                            })
                          }
                        >
                          <div
                            className="country-tile__cover"
                            style={{ background: route.gradient }}
                          ></div>
                          <div className="country-tile__body">
                            <div>
                              <strong>{route.title}</strong>
                              <p className="muted">{route.location}</p>
                            </div>
                            <div className="country-tile__meta">
                              <span>{route.distance}</span>
                              <span>{route.duration}</span>
                              <span>⭐ {route.rating.toFixed(1)}</span>
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

          <div className="collections__grid">
            {themedCollections
              .filter((collection) => collection.routes.length > 0)
              .map((collection) => (
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
                  <div className="collection-card__routes">
                    {collection.routes.map((route) => (
                      <button
                        key={route.id}
                        className="collection-card__route"
                        onClick={() =>
                          navigate("/mapa", {
                            state: {
                              fromDiscover: true,
                              highlightRouteId: route.id,
                            },
                          })
                        }
                      >
                        <div
                          className="collection-card__thumb"
                          style={{ background: route.gradient }}
                        ></div>
                        <div className="collection-card__copy">
                          <strong>{route.title}</strong>
                          <span className="muted">{route.location}</span>
                        </div>
                        <span className="pill mini">
                          ⭐ {route.rating.toFixed(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {themedCollections.every((collection) => collection.routes.length === 0) ? (
              <div className="empty">
                <p className="muted">No hay colecciones disponibles para este país todavía.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
