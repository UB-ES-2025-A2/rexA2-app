import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { useAuth } from "../context/AuthContext";

type TabKey = "profile" | "favorites";
type Units = "km" | "mi";
type ProfileStats = { routes_created: number; routes_completed: number; routes_favorites: number };
type ProfileResponse = {
  id: string;
  username?: string;
  email?: string;
  phone?: string | null;
  preferred_units?: Units | null;
  avatar_url?: string | null;
  stats?: Partial<ProfileStats> | null;
};
type ProfileData = {
  id: string;
  username: string;
  email: string;
  phone: string;
  preferred_units: Units;
  avatar_url: string;
  stats: ProfileStats;
};
type ProfileDraft = { phone: string; avatarUrl: string; units: Units };

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const EMPTY_STATS: ProfileStats = { routes_created: 0, routes_completed: 0, routes_favorites: 0 };

export default function Profile() {
  const [active, setActive] = useState<TabKey>("profile");
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false); // <-- nuevo


  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "error">("loading");
  const [profileError, setProfileError] = useState("");

  const [draftExtras, setDraftExtras] = useState<ProfileDraft>(() => createDraftFromProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
    if (!profile) {
      setDraftExtras(createDraftFromProfile());
      setIsEditing(false);
      return;
    }
    if (!isEditing) {
      setDraftExtras(createDraftFromProfile(profile));
    }
  }, [profile, isEditing]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProfile() {
      if (!accessToken) {
        setProfile(null);
        setProfileStatus("idle");
        setProfileError("Inicia sesión para ver tu perfil.");
        return;
      }
      if (!API_BASE) {
        setProfileStatus("error");
        setProfileError("Configura VITE_API_URL para cargar los datos.");
        return;
      }

      setProfileStatus("loading");
      setProfileError("");
      try {
        const res = await fetch(`${API_BASE}/users/me/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "No se pudo obtener tu perfil.");
        }
        const data = (await res.json()) as ProfileResponse;
        setProfile(normalizeProfile(data));
        setProfileStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setProfileStatus("error");
        setProfileError(err instanceof Error ? err.message : "Error cargando el perfil.");
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [accessToken]);
  

  const handleDraftChange = (patch: Partial<ProfileDraft>) => {
    setDraftExtras((prev) => ({ ...prev, ...patch }));
  };

  const handleAvatarFile = (file: File | null) => {
    if (!file) {
      setAvatarError("");
      setDraftExtras((prev) => ({ ...prev, avatarUrl: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAvatarError("Selecciona un archivo de imagen válido.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError("La imagen debe pesar menos de 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraftExtras((prev) => ({ ...prev, avatarUrl: reader.result as string }));
        setAvatarError("");
      }
    };
    reader.onerror = () => {
      setAvatarError("No se pudo leer la imagen. Inténtalo otra vez.");
    };
    reader.readAsDataURL(file);
  };

  const startEdit = () => {
    if (!profile) return;
    setDraftExtras(createDraftFromProfile(profile));
    setAvatarError("");
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setAvatarError("");
    setIsEditing(false);
    setDraftExtras(createDraftFromProfile(profile));
  };
  const saveEdit = async () => {
    if (!profile || !accessToken) return;
    if (!API_BASE) {
      setProfileError("Configura VITE_API_URL para guardar los cambios.");
      return;
    }
    setIsSaving(true);
    setProfileError("");
    try {
      const payload = {
        phone: draftExtras.phone.trim() || null,
        preferred_units: draftExtras.units,
        avatar_url: draftExtras.avatarUrl || null,
      };
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "No se pudo guardar el perfil.");
      }
      const updated = normalizeProfile((await res.json()) as ProfileResponse);
      setProfile(updated);
      setIsEditing(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Error al guardar el perfil.");
    } finally {
      setIsSaving(false);
    }
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
              profile={profile}
              loadingProfile={profileStatus === "loading"}
              error={profileError}
              stats={profile?.stats ?? EMPTY_STATS}
              isEditing={isEditing}
              draftExtras={draftExtras}
              onChangeDraft={handleDraftChange}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              saving={isSaving}
              onAvatarFile={handleAvatarFile}
              avatarError={avatarError}
            />
          )}
          {active === "favorites" && <FavoritesPanel />}
        </section>
        
      </main>
    </div>
  );
}

function createDraftFromProfile(profile?: ProfileData | null): ProfileDraft {
  return {
    phone: profile?.phone ?? "",
    avatarUrl: profile?.avatar_url ?? "",
    units: profile?.preferred_units ?? "km",
  };
}

function normalizeProfile(payload: ProfileResponse): ProfileData {
  return {
    id: payload.id,
    username: payload.username ?? "",
    email: payload.email ?? "",
    phone: payload.phone ?? "",
    preferred_units: payload.preferred_units === "mi" ? "mi" : "km",
    avatar_url: payload.avatar_url ?? "",
    stats: {
      routes_created: payload.stats?.routes_created ?? 0,
      routes_completed: payload.stats?.routes_completed ?? 0,
      routes_favorites: payload.stats?.routes_favorites ?? 0,
    },
  };
}

type PersonalDataProps = {
  profile: ProfileData | null;
  loadingProfile: boolean;
  error: string;
  stats: ProfileStats;
  isEditing: boolean;
  draftExtras: ProfileDraft;
  onChangeDraft: (patch: Partial<ProfileDraft>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void | Promise<void>;
  saving: boolean;
  onAvatarFile: (file: File | null) => void;
  avatarError: string;
};

function PersonalData({
  profile,
  loadingProfile,
  error,
  stats,
  isEditing,
  draftExtras,
  onChangeDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  saving,
  onAvatarFile,
  avatarError,
}: PersonalDataProps) {
  const viewExtras = isEditing ? draftExtras : createDraftFromProfile(profile);
  const username = profile?.username ?? "";
  const email = profile?.email ?? "";

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
              <button className="btn-primary sm" type="button" onClick={onSaveEdit} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </>
          ) : (
            <button
              className="btn-primary sm"
              type="button"
              onClick={onStartEdit}
              disabled={!profile || loadingProfile}
            >
              Editar
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="info-grid">
        <InfoRow
          label="Nombre de usuario"
          value={username || "Sin definir"}
          loading={loadingProfile}
        />
        <InfoRow label="Email" value={email || "Sin email"} loading={loadingProfile} />
      </div>

      <div className="profile-widgets">
        <div className="avatar-block">
          <div className="avatar-frame">
            {viewExtras.avatarUrl ? (
              <img src={viewExtras.avatarUrl} alt="Avatar del usuario" />
            ) : (
              <span>{username?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          {isEditing ? (
            <div className="avatar-inputs">
              <label className="btn-ghost sm" htmlFor="avatar-upload">
                Seleccionar foto
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  onAvatarFile(file);
                  event.target.value = "";
                }}
              />
              {viewExtras.avatarUrl && (
                <button className="btn-ghost sm" type="button" onClick={() => onAvatarFile(null)}>
                  Quitar foto
                </button>
              )}
              {avatarError && (
                <p className="muted" style={{ color: "#d22", marginTop: 8 }}>
                  {avatarError}
                </p>
              )}
            </div>
          ) : (
            <p className="muted">{viewExtras.avatarUrl ? "Foto personalizada." : "Personaliza tu foto cuando quieras."}</p>
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
        <StatCard label="Rutas creadas" value={stats.routes_created} />
        <StatCard label="Rutas realizadas" value={stats.routes_completed} />
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
