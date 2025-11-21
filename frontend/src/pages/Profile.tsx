import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";
import RouteDetailsCard from "../components/RouteViewCard/RouteDetailsCard";
import type { Category } from "../components/types";
import AnimatedList from "../components/AnimatedList";
import defaultAvatar from "../assets/profile_pic.png";
//import { addAttrValue } from "framer-motion";
//import { div } from "framer-motion/client";
type TabKey = "profile" | "favorites" | "created" | "followers";
type Units = "km" | "mi";
type ProfileStats = {
  routes_created: number;
  routes_completed: number;
  routes_favorites: number;
};
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
type FavoriteRoutePoint = { latitude: number; longitude: number };
type FavoriteRouteApi = {
  id?: string;
  _id?: string;
  name: string;
  description: string;
  category: string;
  owner_id: string;
  created_at: string;
  visibility: boolean;
  points: FavoriteRoutePoint[];
  owner_username?: string | null;
};
type FavoriteRoute = {
  id: string;
  name: string;
  description: string;
  category: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  visibility: boolean;
  points: Array<[number, number]>;
};

// ============= Seguidores =============
type Follower = {
  id: string;
  name: string;
  username: string;
  // Añado también el avatar
  avatarUrl?: string | null;
};
// =======================================

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/$/, "");
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const EMPTY_STATS: ProfileStats = {
  routes_created: 0,
  routes_completed: 0,
  routes_favorites: 0,
};

export default function Profile() {
  const [active, setActive] = useState<TabKey>("profile");
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false); // <-- nuevo

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [profileError, setProfileError] = useState("");

  const [draftExtras, setDraftExtras] = useState<ProfileDraft>(() =>
    createDraftFromProfile()
  );

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followersStatus, setFollowersStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [followersError, setFollowersError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [favoritesStatus, setFavoritesStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [favoritesError, setFavoritesError] = useState("");
  const [selectedFavorite, setSelectedFavorite] =
    useState<FavoriteRoute | null>(null);
  const [createdRoutes, setCreatedRoutes] = useState<FavoriteRoute[]>([]);
  const [createdStatus, setCreatedStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [createdError, setCreatedError] = useState("");
  const [selectedCreatedRoute, setSelectedCreatedRoute] =
    useState<FavoriteRoute | null>(null);

  const accessToken =
    token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("access_token") || ""
      : "");

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
        setProfileError(
          err instanceof Error ? err.message : "Error cargando el perfil."
        );
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setCreatedRoutes([]);
      setCreatedStatus("idle");
      setCreatedError("");
      return;
    }

    const controller = new AbortController();
    setCreatedStatus("loading");
    setCreatedError("");
    const ownerFallback = profile?.username || profile?.email || "Yo";

    async function fetchCreatedRoutes() {
      try {
        const res = await fetch(`${API_BASE}/routes/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "No se pudieron cargar tus rutas creadas.");
        }
        const data = (await res.json()) as FavoriteRouteApi[];
        setCreatedRoutes(
          data.map((route) => normalizeFavoriteRoute(route, ownerFallback))
        );
        setCreatedStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setCreatedStatus("error");
        setCreatedError(
          err instanceof Error ? err.message : "Error al cargar tus rutas."
        );
      }
    }

    fetchCreatedRoutes();
    return () => controller.abort();
  }, [accessToken, profile?.username, profile?.email]);

  useEffect(() => {
    if (!accessToken) {
      setFavorites([]);
      setFavoritesStatus("idle");
      setFavoritesError("");
      return;
    }

    const controller = new AbortController();
    setFavoritesStatus("loading");
    setFavoritesError("");

    async function fetchFavorites() {
      try {
        const res = await fetch(`${API_BASE}/users/me/routes/favorites`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(
            detail || "No se pudieron cargar las rutas favoritas."
          );
        }
        const data = (await res.json()) as FavoriteRouteApi[];
        setFavorites(data.map((route) => normalizeFavoriteRoute(route)));
        setFavoritesStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setFavoritesStatus("error");
        setFavoritesError(
          err instanceof Error ? err.message : "Error al cargar las favoritas."
        );
      }
    }

    fetchFavorites();
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (active !== "favorites" && selectedFavorite) {
      setSelectedFavorite(null);
    }
    if (active !== "created" && selectedCreatedRoute) {
      setSelectedCreatedRoute(null);
    }
  }, [active, selectedFavorite, selectedCreatedRoute]);

  useEffect(() => {
    if (!selectedFavorite) return;
    if (!favorites.some((route) => route.id === selectedFavorite.id)) {
      setSelectedFavorite(null);
    }
  }, [favorites, selectedFavorite]);

  useEffect(() => {
    if (!selectedCreatedRoute) return;
    if (!createdRoutes.some((route) => route.id === selectedCreatedRoute.id)) {
      setSelectedCreatedRoute(null);
    }
  }, [createdRoutes, selectedCreatedRoute]);

  useEffect(() => {
    if (!accessToken) {
      setFollowers([]);
      setFollowersStatus("idle");
      setFollowersError("");
      return;
    }

    if (!API_BASE) {
      setFollowersStatus("error");
      setFollowersError("Configura VITE_API_URL para cargar seguidores.");
      return;
    }

    const controller = new AbortController();
    setFollowersStatus("loading");
    setFollowersError("");

    async function fetchFollowers() {
      try {
        const res = await fetch(`${API_BASE}/users/me/followers`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "No se pudieron cargar los seguidores.");
        }

        const data = (await res.json()) as FollowerAPI[];
        setFollowers(data.map(normalizeFollower));
        setFollowersStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setFollowersStatus("error");
        setFollowersError(
          err instanceof Error ? err.message : "Error al cargar los seguidores."
        );
      }
    }

    fetchFollowers();
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
        setDraftExtras((prev) => ({
          ...prev,
          avatarUrl: reader.result as string,
        }));
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
      setProfileError(
        err instanceof Error ? err.message : "Error al guardar el perfil."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const showFavoriteRoute = active === "favorites" && Boolean(selectedFavorite);
  const showCreatedRoute =
    active === "created" && Boolean(selectedCreatedRoute);

  const handleSelectFavorite = (route: FavoriteRoute) => {
    setSelectedFavorite(route);
  };

  const handleSelectCreatedRoute = (route: FavoriteRoute) => {
    setSelectedCreatedRoute(route);
  };

  const closeFavoriteView = () => {
    setSelectedFavorite(null);
  };

  const closeCreatedView = () => {
    setSelectedCreatedRoute(null);
  };

  const handleFavoriteSavedChange = (saved: boolean) => {
    if (saved || !selectedFavorite) return;
    setFavorites((prev) =>
      prev.filter((route) => route.id !== selectedFavorite.id)
    );
    closeFavoriteView();
  };

  const handleCreatedSavedChange = (saved: boolean) => {
    if (!selectedCreatedRoute) return;
    setFavorites((prev) => {
      const exists = prev.some((route) => route.id === selectedCreatedRoute.id);
      if (saved && !exists) {
        return [...prev, selectedCreatedRoute];
      }
      if (!saved && exists) {
        return prev.filter((route) => route.id !== selectedCreatedRoute.id);
      }
      return prev;
    });
  };

  return (
    <div className="profile-root">
      <header className="header">
        <div className="header__inner">
          <div className="header-left">
            <button
              aria-label="Ir al inicio"
              onClick={() => navigate("/")}
              className="btn-home"
            >
              🏠
            </button>
            <div className="header-title">
              <span className="eyebrow"></span>
              <h1>Perfil</h1>
            </div>
          </div>
          <div className="profile-menu-container">
            <button
              className="profile-menu-btn"
              onClick={() => {
                if (token) setProfileMenuOpen((v) => !v);
                else navigate("/"); // si no está logueado, llévalo a Home a iniciar sesión
              }}
              aria-label="Profile"
              aria-haspopup={token ? "menu" : undefined}
              aria-expanded={token ? profileMenuOpen : undefined}
            >
              <span>👤</span>
            </button>

            {token ? (
              <div
                className={`profile-menu ${profileMenuOpen ? "open" : ""}`}
                role="menu"
                aria-label="Profile menu"
              >
                <button
                  className="profile-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/perfil"); // ya estás en perfil, pero así es consistente
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
        <aside
          className={`sidebar ${
            showFavoriteRoute || showCreatedRoute ? "sidebar-route-open" : ""
          }`}
        >
          {showFavoriteRoute && selectedFavorite ? (
            <RouteDetailsCard
              routeId={selectedFavorite.id}
              name={selectedFavorite.name}
              description={selectedFavorite.description || "Sin descripción"}
              category={
                (selectedFavorite.category as Category) || "entretenimiento"
              }
              points={selectedFavorite.points}
              isPrivate={!selectedFavorite.visibility}
              onClose={closeFavoriteView}
              initialSaved
              onSavedChange={handleFavoriteSavedChange}
            />
          ) : showCreatedRoute && selectedCreatedRoute ? (
            <RouteDetailsCard
              routeId={selectedCreatedRoute.id}
              name={selectedCreatedRoute.name}
              description={
                selectedCreatedRoute.description || "Sin descripción"
              }
              category={
                (selectedCreatedRoute.category as Category) || "entretenimiento"
              }
              points={selectedCreatedRoute.points}
              isPrivate={!selectedCreatedRoute.visibility}
              onClose={closeCreatedView}
              initialSaved={favorites.some(
                (route) => route.id === selectedCreatedRoute.id
              )}
              onSavedChange={handleCreatedSavedChange}
            />
          ) : (
            <ul className="menu">
              <li>
                <button
                  className={`btn ${active === "profile" ? "active" : ""}`}
                  onClick={() => setActive("profile")}
                >
                  <span className="icon" aria-hidden="true">
                    👤
                  </span>
                  <span className="label">Perfil</span>
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
              <li>
                <button
                  className={`btn ${active === "created" ? "active" : ""}`}
                  onClick={() => setActive("created")}
                >
                  <span className="icon" aria-hidden="true">
                    🛣️
                  </span>
                  <span className="label">Mis rutas</span>
                </button>
              </li>

              {/* Pestaña del Panel Seguidores */}
              <li>
                <button
                  className={`btn ${active === "followers" ? "active" : ""}`}
                  onClick={() => setActive("followers")}
                >
                  <span className="icon" aria-hidden="true">
                    👥
                  </span>
                  <span className="label">Seguidores</span>
                </button>
              </li>
            </ul>
          )}
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
              // Seguidores
              followers={followers}
              // Para poder acceder desde el panel
              onGoToFollowers={() => setActive("followers")}
              onGoToFavorites={() => setActive("favorites")}
              onGoToCreated={() => setActive("created")}
            />
          )}
          {active === "favorites" && (
            <FavoritesPanel
              favorites={favorites}
              status={favoritesStatus}
              error={favoritesError}
              onViewRoute={handleSelectFavorite}
              selectedRoute={selectedFavorite}
              onCloseRoute={closeFavoriteView}
            />
          )}
          {active === "created" && (
            <CreatedRoutesPanel
              routes={createdRoutes}
              status={createdStatus}
              error={createdError}
              onViewRoute={handleSelectCreatedRoute}
              selectedRoute={selectedCreatedRoute}
              onCloseRoute={closeCreatedView}
            />
          )}
          {active === "followers" && (
            <FollowersPanel
              followers={followers}
              status={followersStatus}
              error={followersError}
            />
          )}
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

function normalizeFavoriteRoute(
  route: FavoriteRouteApi,
  ownerFallback?: string
): FavoriteRoute {
  const normalizedPoints: Array<[number, number]> = Array.isArray(route.points)
    ? route.points
        .filter(
          (point): point is FavoriteRoutePoint =>
            typeof point?.longitude === "number" &&
            typeof point?.latitude === "number"
        )
        .map((point) => [point.longitude, point.latitude])
    : [];

  const createdAt =
    typeof route.created_at === "string"
      ? route.created_at
      : new Date(route.created_at).toISOString();

  return {
    id: route.id ?? route._id ?? "",
    name: route.name,
    description: route.description ?? "",
    category: route.category ?? "Sin categoría",
    ownerId: route.owner_id,
    ownerName: route.owner_username ?? ownerFallback ?? route.owner_id,
    createdAt,
    visibility: Boolean(route.visibility),
    points: normalizedPoints,
  };
}

type FollowerAPI = {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
};

function normalizeFollower(payload: FollowerAPI): Follower {
  return {
    id: payload.id,
    username: payload.username,
    name: payload.name,
    avatarUrl: payload.avatarUrl ?? null,
  };
}

function formatDateLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  // Para los seguidores
  followers: Follower[];
  onGoToFollowers: () => void;
  //
  onGoToFavorites: () => void;
  onGoToCreated: () => void;
};

function PersonalData({
  profile,
  loadingProfile,
  error,
  stats,
  isEditing,
  draftExtras,
  //onChangeDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  saving,
  onAvatarFile,
  avatarError,
  followers,
  onGoToFollowers,
  onGoToFavorites,
  onGoToCreated,
}: PersonalDataProps) {
  const viewExtras = isEditing ? draftExtras : createDraftFromProfile(profile);
  const username = profile?.username ?? "";
  const email = profile?.email ?? "";

  return (
    <div className="card fill profile-panel">
      <div className="panel-header">
        <div>
          <h2>Perfil</h2>
        </div>
        <div className="panel-actions">
          {isEditing ? (
            <>
              <button
                className="btn-ghost sm"
                type="button"
                onClick={onCancelEdit}
              >
                Cancelar
              </button>
              <button
                className="btn-primary sm"
                type="button"
                onClick={onSaveEdit}
                disabled={saving}
              >
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

      {/* NUEVO layout*/}
      <div className="profile-top">
        {/* Avatar primero, bajo el título */}
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
                <button
                  className="btn-ghost sm"
                  type="button"
                  onClick={() => onAvatarFile(null)}
                >
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
            <p className="muted">
              {viewExtras.avatarUrl
                ? "Foto personalizada."
                : "Personaliza tu foto cuando quieras."}
            </p>
          )}
        </div>

        {/* Columna derecha: nombre, email, teléfono, unidades */}
        <div className="profile-top-main">
          {/* Nombre de usuario + email al lado (en desktop) */}
          <div className="info-grid info-grid--main">
            <InfoRow
              label="Nombre de usuario"
              value={username || "Sin definir"}
              loading={loadingProfile}
            />
            <InfoRow
              label="Email"
              value={email || "Sin email"}
              loading={loadingProfile}
            />
          </div>

          {/* Debajo, teléfono y unidades  (yo lo quitaría)*/}
          <div className="profile-widgets">
            {/*
            <div className="extra-block">
              <span className="extra-label">Teléfono (opcional)</span>
              {isEditing ? (
                <input
                  className="input"
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={draftExtras.phone}
                  onChange={(event) =>
                    onChangeDraft({ phone: event.target.value })
                  }
                />
              ) : (
                <p className="data-highlight">
                  {viewExtras.phone || "Sin número"}
                </p>
              )}
            </div>
            */}
            {/*
            <div className="extra-block">
              <span className="extra-label">Unidades preferidas</span>
              {isEditing ? (
                <div
                  className="unit-options"
                  role="radiogroup"
                  aria-label="Elegir unidades"
                >
                  {(["km", "mi"] as Units[]).map((unit) => (
                    <label
                      key={unit}
                      className={`unit-chip ${
                        draftExtras.units === unit ? "selected" : ""
                      }`}
                    >
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
                <span className="badge">
                  {viewExtras.units === "km" ? "Kilómetros" : "Millas"}
                </span>
              )}
            </div>
            */}
          </div>
        </div>
      </div>
      {/* 1) Seguidores, solo arriba */}
      <div className="stats-summary">
        <button type="button" className="stats-card" onClick={onGoToFollowers}>
          <span className="stat-value">{followers.length}</span>
          <span className="stat-label">
            {followers.length === 1 ? "Seguidor" : "Seguidores"}
          </span>
        </button>
      </div>

      {/* 2) Bajo seguidores, todo lo relacionado con rutas */}
      <div className="stats-summary">
        <button type="button" className="stats-card" onClick={onGoToCreated}>
          <span className="stats-card-title">Rutas creadas</span>
          <span className="stats-card-count">{stats.routes_created}</span>
          <span className="stats-card-cta">Ver mis rutas</span>
        </button>

        <button type="button" className="stats-card" onClick={onGoToFavorites}>
          <span className="stats-card-title">Rutas favoritas</span>
          <span className="stats-card-count">{stats.routes_favorites}</span>
          <span className="stats-card-cta">Ver rutas favoritas</span>
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{loading ? "Cargando…" : value}</span>
    </div>
  );
}

type FavoritesPanelProps = {
  favorites: FavoriteRoute[];
  status: "idle" | "loading" | "error";
  error: string;
  selectedRoute: FavoriteRoute | null;
  onViewRoute: (route: FavoriteRoute) => void;
  onCloseRoute: () => void;
};

function FavoritesPanel({
  favorites,
  status,
  error,
  selectedRoute,
  onViewRoute,
  onCloseRoute,
}: FavoritesPanelProps) {
  if (selectedRoute) {
    const ownerLabel = selectedRoute.ownerName || selectedRoute.ownerId;
    return (
      <div className="card fill favorites-panel">
        <div className="section-title favorites-panel__header">
          <div>
            <h2>{selectedRoute.name}</h2>
            <p>
              Propietario <strong>{ownerLabel}</strong> · Creada el{" "}
              {formatDateLabel(selectedRoute.createdAt)}
            </p>
          </div>
          <button className="btn-ghost" type="button" onClick={onCloseRoute}>
            Cerrar
          </button>
        </div>
        <div className="favorites-map-shell" style={{ minHeight: 360 }}>
          <MapView
            className="favorites-map"
            highlightPoints={selectedRoute.points}
          />
        </div>
      </div>
    );
  }

  const hasFavorites = favorites.length > 0;

  const favoriteItems = favorites.map((route) => (
    <div className="route-row">
      <div className="route-row-main">
        <div className="route-row-title">{route.name}</div>
        <div className="route-row-meta">
          <span>{route.ownerName || route.ownerId}</span>
          <span>· {route.category}</span>
          <span>· {formatDateLabel(route.createdAt)}</span>
        </div>
      </div>
      <div className="route-row-cta">Ver detalles</div>
    </div>
  ));

  return (
    <div className="card fill">
      <div className="section-title">
        <h2>Rutas favoritas</h2>
        <p>Accede y gestiona tus rutas</p>
      </div>

      {status === "error" && error && (
        <div className="alert error">{error}</div>
      )}

      {status === "loading" && !hasFavorites ? (
        <p className="muted">Cargando tus rutas guardadas…</p>
      ) : !hasFavorites ? (
        <p className="muted">Aún no has guardado rutas favoritas.</p>
      ) : (
        <AnimatedList
          items={favoriteItems}
          className="routes-animated-list"
          itemClassName="routes-animated-item"
          showGradients
          onItemSelect={(index) => onViewRoute(favorites[index])}
        />
      )}

      {status === "loading" && hasFavorites && (
        <p className="muted" style={{ marginTop: 12 }}>
          Actualizando lista…
        </p>
      )}
    </div>
  );
}

type CreatedRoutesPanelProps = {
  routes: FavoriteRoute[];
  status: "idle" | "loading" | "error";
  error: string;
  selectedRoute: FavoriteRoute | null;
  onViewRoute: (route: FavoriteRoute) => void;
  onCloseRoute: () => void;
};

function CreatedRoutesPanel({
  routes,
  status,
  error,
  selectedRoute,
  onViewRoute,
  onCloseRoute,
}: CreatedRoutesPanelProps) {
  if (selectedRoute) {
    const ownerLabel = selectedRoute.ownerName || selectedRoute.ownerId;
    return (
      <div className="card fill favorites-panel">
        <div className="section-title favorites-panel__header">
          <div>
            <h2>{selectedRoute.name}</h2>
            <p>
              Propietario <strong>{ownerLabel}</strong> · Creada el{" "}
              {formatDateLabel(selectedRoute.createdAt)}
            </p>
          </div>
          <button className="btn-ghost" type="button" onClick={onCloseRoute}>
            Cerrar
          </button>
        </div>
        <div className="favorites-map-shell" style={{ minHeight: 360 }}>
          <MapView
            className="favorites-map"
            highlightPoints={selectedRoute.points}
          />
        </div>
      </div>
    );
  }

  const hasRoutes = routes.length > 0;

  const createdItems = routes.map((route) => (
    <div className="route-row">
      <div className="route-row-main">
        <div className="route-row-title">{route.name}</div>
        <div className="route-row-meta">
          <span>{route.ownerName || route.ownerId}</span>
          <span>· {route.category}</span>
          <span>· {formatDateLabel(route.createdAt)}</span>
        </div>
      </div>
      <div className="route-row-cta">Ver detalles</div>
    </div>
  ));

  return (
    <div className="card fill">
      <div className="section-title">
        <h2>Mis rutas</h2>
        <p>Listado de rutas creadas por ti</p>
      </div>

      {status === "error" && error && (
        <div className="alert error">{error}</div>
      )}

      {status === "loading" && !hasRoutes ? (
        <p className="muted">Cargando tus rutas…</p>
      ) : !hasRoutes ? (
        <p className="muted">Todavía no has creado rutas.</p>
      ) : (
        <AnimatedList
          items={createdItems}
          className="routes-animated-list"
          itemClassName="routes-animated-item"
          showGradients
          onItemSelect={(index) => onViewRoute(routes[index])}
        />
      )}

      {status === "loading" && hasRoutes && (
        <p className="muted" style={{ marginTop: 12 }}>
          Actualizando lista…
        </p>
      )}
    </div>
  );
}

type FollowersPanelProps = {
  followers: Follower[];
  status: "idle" | "loading" | "error";
  error: string;
};

function FollowersPanel({ followers, status, error }: FollowersPanelProps) {
  const navigate = useNavigate();
  /**Seguir aquí con el paso 3 de ajustar el panel */
  if (status === "loading" && followers.length === 0) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Seguidores</h2>
          <p>Personas qeu siguen tus rutas y actividad</p>
        </div>
        <p className="muted">Cargando seguidores...</p>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Seguidores</h2>
          <p>Personas que siguen tus rutas y actividad</p>
        </div>
        <div className="alert error">{error}</div>
      </div>
    );
  }

  if (status.length === 0) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Seguidores</h2>
          <p>Personas qeu siguen tus rutas y tu actividad</p>
        </div>
        <p className="muted">Todavía no tienes seguidores</p>
      </div>
    );
  }

  const followerItems = followers.map((follower) => (
    <div className="follower-row" key={follower.id}>
      <div className="followers-avatar">
        <img
          src={follower.avatarUrl || defaultAvatar}
          alt={`Avatar de ${follower.username}`}
        />
      </div>
      <div className="followers-info">
        <div className="followers-username">@{follower.username}</div>
        <div className="followers-name">{follower.name}</div>
      </div>
    </div>
  ));

  const handleSelectFollower = (index: number) => {
    const follower = followers[index];
    if (!follower) return;

    // Aquí falta la URL del endpoint
    navigate("");
  };

  return (
    <div className="card fill">
      <div className="section-title">
        <h2>Seguidores</h2>
        <p>Personas que siguen tus rutas y actividad</p>
      </div>

      <AnimatedList
        items={followerItems}
        className="followers-animated-list"
        itemClassName="followers-animated-item"
        showGradients
        onItemSelect={handleSelectFollower}
      />
    </div>
  );
}
