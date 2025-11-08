import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { useAuth } from "../context/AuthContext";

type TabKey = "profile" | "favorites";
type Units = "km" | "mi";
type Identity = { username?: string; email?: string };
type ExtraFields = { phone: string; avatarUrl: string; units: Units };
type Stats = { created: number; completed: number };

const STORAGE_KEY = "profile_extras";
const DEFAULT_EXTRAS: ExtraFields = { phone: "", avatarUrl: "", units: "km" };
const SAMPLE_STATS: Stats = { created: 12, completed: 34 };
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export default function Profile() {
  const [active, setActive] = useState<TabKey>("profile");
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false); // <-- nuevo


  const [identity, setIdentity] = useState<Identity>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");

  const [extras, setExtras] = useState<ExtraFields>(() => readExtrasFromStorage());
  const [draftExtras, setDraftExtras] = useState<ExtraFields>(extras);
  const [isEditing, setIsEditing] = useState(false);

  const accessToken =
    token || (typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "");

  useEffect(() => {
    const root = document.getElementById("root");
    root?.classList.add("profile-root-host");
    document.body.classList.add("profile-body-host");

    return () => {
      root?.classList.remove("profile-root-host");
      document.body.classList.remove("profile-body-host");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
  }, [extras]);

  useEffect(() => {
    if (!isEditing) {
      setDraftExtras(extras);
    }
  }, [isEditing, extras]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchIdentity() {
      if (!accessToken) {
        setStatus("error");
        setError("Inicia sesión para ver tu perfil.");
        return;
      }
      if (!API_BASE) {
        setStatus("error");
        setError("Configura VITE_API_URL para cargar los datos.");
        return;
      }

      setStatus("loading");
      setError("");
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "No se pudo obtener la información.");
        }
        const data = await res.json();
        setIdentity({ username: data.username ?? "", email: data.email ?? "" });
        setStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Error cargando los datos.");
      }
    }

    fetchIdentity();
    return () => controller.abort();
  }, [accessToken]);

  const handleDraftChange = (patch: Partial<ExtraFields>) => {
    setDraftExtras((prev) => ({ ...prev, ...patch }));
  };

  const startEdit = () => {
    setDraftExtras(extras);
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setDraftExtras(extras);
    setIsEditing(false);
  };
  const saveEdit = () => {
    setExtras(draftExtras);
    setIsEditing(false);
  };

  return (
    <div className="profile-root">
      <header className="header">
        <div className="header__inner">
          <div className="header-left">
            <button aria-label="Ir al inicio" onClick={() => navigate("/")} className="btn-home">
              🏠
            </button>
            <div className="header-title">
              <span className="eyebrow">Panel</span>
              <h1>Perfil</h1>
            </div>
          </div>
          <div className="profile-menu-container">
            <button
                className="profile-menu-btn"
                onClick={() => {
                if (token) setProfileMenuOpen(v => !v);
                else navigate("/"); // si no está logueado, llévalo a Home a iniciar sesión
                }}
                aria-label="Profile"
                aria-haspopup={token ? "menu" : undefined}
                aria-expanded={token ? profileMenuOpen : undefined}
            >
                <span>👤</span>
            </button>

            {token ? (
                <div className={`profile-menu ${profileMenuOpen ? "open" : ""}`} role="menu" aria-label="Profile menu">
                <button
                    className="profile-menu__item"
                    role="menuitem"
                    onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/perfil");   // ya estás en perfil, pero así es consistente
                    }}
                >
                    Mi perfil
                </button>

                {/* Ajustes eliminado en Profile por ahora */}

                <button
                    className="profile-menu__item"
                    role="menuitem"
                    onClick={() => {
                    logout();
                    setProfileMenuOpen(false);
                    navigate("/");
                    }}
                >
                    Cerrar sesión
                </button>
                </div>
            ) : null}
            </div>
        </div>
      </header>

      <main className="profile-layout">
        <aside className="sidebar">
          <ul className="menu">
            <li>
              <button
                className={`btn ${active === "profile" ? "active" : ""}`}
                onClick={() => setActive("profile")}
              >
                <span className="icon" aria-hidden="true">
                  👤
                </span>
                <span className="label">Datos personales</span>
              </button>
            </li>
            <li>
              <button
                className={`btn ${active === "favorites" ? "active" : ""}`}
                onClick={() => setActive("favorites")}
              >
                <span className="icon" aria-hidden="true">
                  ⭐
                </span>
                <span className="label">Favoritas</span>
              </button>
            </li>
          </ul>
        </aside>

        <section className="content">
          {active === "profile" && (
            <PersonalData
              identity={identity}
              loadingIdentity={status === "loading"}
              error={error}
              stats={SAMPLE_STATS}
              isEditing={isEditing}
              extras={extras}
              draftExtras={draftExtras}
              onChangeDraft={handleDraftChange}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
            />
          )}
          {active === "favorites" && <FavoritesPanel />}
        </section>
      </main>
    </div>
  );
}

function readExtrasFromStorage(): ExtraFields {
  if (typeof window === "undefined") return DEFAULT_EXTRAS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXTRAS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EXTRAS,
      ...parsed,
      units: parsed.units === "mi" ? "mi" : "km",
    };
  } catch {
    return DEFAULT_EXTRAS;
  }
}

type PersonalDataProps = {
  identity: Identity;
  loadingIdentity: boolean;
  error: string;
  stats: Stats;
  isEditing: boolean;
  extras: ExtraFields;
  draftExtras: ExtraFields;
  onChangeDraft: (patch: Partial<ExtraFields>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
};

function PersonalData({
  identity,
  loadingIdentity,
  error,
  stats,
  isEditing,
  extras,
  draftExtras,
  onChangeDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: PersonalDataProps) {
  const viewExtras = isEditing ? draftExtras : extras;

  return (
    <div className="card fill profile-panel">
      <div className="panel-header">
        <div>
          <h2>Datos personales</h2>
          <p>Información conectada con tu cuenta</p>
        </div>
        <div className="panel-actions">
          {isEditing ? (
            <>
              <button className="btn-ghost sm" type="button" onClick={onCancelEdit}>
                Cancelar
              </button>
              <button className="btn-primary sm" type="button" onClick={onSaveEdit}>
                Guardar
              </button>
            </>
          ) : (
            <button className="btn-primary sm" type="button" onClick={onStartEdit}>
              Editar
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="info-grid">
        <InfoRow
          label="Nombre de usuario"
          value={identity.username || "Sin definir"}
          loading={loadingIdentity}
        />
        <InfoRow label="Email" value={identity.email || "Sin email"} loading={loadingIdentity} />
      </div>

      <div className="profile-widgets">
        <div className="avatar-block">
          <div className="avatar-frame">
            {viewExtras.avatarUrl ? (
              <img src={viewExtras.avatarUrl} alt="Avatar del usuario" />
            ) : (
              <span>{identity.username?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          {isEditing ? (
            <input
              className="input"
              type="url"
              placeholder="https://mis-fotos.com/avatar.png"
              value={draftExtras.avatarUrl}
              onChange={(event) => onChangeDraft({ avatarUrl: event.target.value })}
            />
          ) : (
            <p className="muted">Personaliza tu foto cuando quieras.</p>
          )}
        </div>

        <div className="extra-block">
          <span className="extra-label">Teléfono (opcional)</span>
          {isEditing ? (
            <input
              className="input"
              type="tel"
              placeholder="+34 600 000 000"
              value={draftExtras.phone}
              onChange={(event) => onChangeDraft({ phone: event.target.value })}
            />
          ) : (
            <p className="data-highlight">{viewExtras.phone || "Sin número"}</p>
          )}
        </div>

        <div className="extra-block">
          <span className="extra-label">Unidades preferidas</span>
          {isEditing ? (
            <div className="unit-options" role="radiogroup" aria-label="Elegir unidades">
              {(["km", "mi"] as Units[]).map((unit) => (
                <label key={unit} className={`unit-chip ${draftExtras.units === unit ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="units"
                    value={unit}
                    checked={draftExtras.units === unit}
                    onChange={() => onChangeDraft({ units: unit })}
                  />
                  {unit === "km" ? "Kilómetros" : "Millas"}
                </label>
              ))}
            </div>
          ) : (
            <span className="badge">{viewExtras.units === "km" ? "Kilómetros" : "Millas"}</span>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Rutas creadas" value={stats.created} />
        <StatCard label="Rutas realizadas" value={stats.completed} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, loading }: { label: string; value: ReactNode; loading?: boolean }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{loading ? "Cargando…" : value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function FavoritesPanel() {
  const favorites = [
    { id: "f1", name: "Casa - Trabajo", distance: "14.2 km", duration: "23 min", updatedAt: "2025-10-18" },
    { id: "f2", name: "Gimnasio", distance: "3.8 km", duration: "8 min", updatedAt: "2025-09-02" },
  ];

  return (
    <div className="card fill">
      <div className="section-title">
        <h2>Rutas favoritas</h2>
        <p>Accede y gestiona tus rutas</p>
      </div>
      <div className="table-scroll grow">
        <table className="table">
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Distancia</th>
              <th>Duración</th>
              <th>Actualizada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {favorites.map((route) => (
              <tr key={route.id}>
                <td>{route.name}</td>
                <td>{route.distance}</td>
                <td>{route.duration}</td>
                <td>{route.updatedAt}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn-ghost">Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
