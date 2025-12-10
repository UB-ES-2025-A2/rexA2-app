import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { useAuth } from "../context/AuthContext";
import { useTheme, type ThemePreference } from "../context/ThemeContext";
import { useUnitPreference } from "../context/UnitPreferenceContext";
import { translateErrorMessage } from "../utils/errorTranslator";
import MapView from "../components/MapView";
import RouteDetailsCard from "../components/RouteViewCard/RouteDetailsCard";
import type { Category } from "../components/types";
import AnimatedList from "../components/AnimatedList";
import RoutePreviewCard from "../components/RoutePreviewCard/RoutePreviewCard";
import defaultAvatar from "../assets/profile_pic.png";
import UserPreviewCard from "../components/UserViewCard/UserPreviewCard";
import CompletedRoutesAchievements from "../components/Achievements/CompletedRoutesAchievements";
import CreatedRoutesAchievements from "../components/Achievements/CreatedRoutesAchievements";
import ThemeAchievementsBlock from "../components/Achievements/ThemeAchievementsBlock";
import DistanceAchievementsBlock from "../components/Achievements/DistanceAchievementsBlock";

type TabKey = "favorites" | "created" | "followers" | "following";
type Units = "km" | "mi";
type ThemePref = ThemePreference;
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
  theme_preference?: ThemePref | null;
  avatar_url?: string | null;
  stats?: Partial<ProfileStats> | null;
};
type ProfileData = {
  id: string;
  username: string;
  email: string;
  phone: string;
  preferred_units: Units;
  theme_preference: ThemePref;
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
  rating?: number | null;
  rating_count?: number | null;
  user_rating?: number | null;
  images?: string[];
  is_completed?: boolean;
  completed?: boolean;
  isCompleted?: boolean;
  completed_by_user?: boolean;
  completedAt?: string;
  completed_at?: string;
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
  rating?: number | null;
  rating_count?: number | null;
  user_rating?: number | null;
  images: string[];
  isCompleted?: boolean;
  completedAt?: string | null;
};

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

const normalizeCompletedFlag = (value: any, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return value === true || value === 1;
};

export default function Profile() {
  const [active, setActive] = useState<TabKey>("favorites");
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { setUnit } = useUnitPreference();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [profileError, setProfileError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [draftExtras, setDraftExtras] = useState<ProfileDraft>(() =>
    createDraftFromProfile()
  );

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followersStatus, setFollowersStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [followersError, setFollowersError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [, setAvatarError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [favoritesStatus, setFavoritesStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [favoritesError, setFavoritesError] = useState("");
  const [selectedFavorite, setSelectedFavorite] =
    useState<FavoriteRoute | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [createdRoutes, setCreatedRoutes] = useState<FavoriteRoute[]>([]);
  const [createdStatus, setCreatedStatus] = useState<
    "idle" | "loading" | "error"
  >("loading");
  const [createdError, setCreatedError] = useState("");
  const [selectedCreatedRoute, setSelectedCreatedRoute] =
    useState<FavoriteRoute | null>(null);
  const [achievementsRefreshKey, setAchievementsRefreshKey] = useState(0);

  const accessToken =
    token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("access_token") || ""
      : "");

  useEffect(() => {
    let cancelled = false;
    const loadCompleted = async () => {
      if (!accessToken) {
        setCompletedIds(new Set());
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/routes/completed/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const ids = Array.isArray(data?.route_ids)
          ? data.route_ids.map(String)
          : [];
        if (!cancelled) setCompletedIds(new Set(ids));
      } catch (err) {
        console.warn("No se pudieron cargar rutas completadas", err);
      }
    };
    loadCompleted();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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
          translateErrorMessage(err instanceof Error ? err.message : "Error cargando el perfil.")
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
        const mapped = data.map((route) => {
          const normalized = normalizeFavoriteRoute(route, ownerFallback);
          return {
            ...normalized,
            isCompleted:
              completedIds.has(normalized.id) || normalized.isCompleted,
          };
        });
        setCreatedRoutes(mapped);
        setCreatedStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setCreatedStatus("error");
        setCreatedError(
          translateErrorMessage(err instanceof Error ? err.message : "Error al cargar tus rutas.")
        );
      }
    }

    fetchCreatedRoutes();
    return () => controller.abort();
  }, [accessToken, profile?.username, profile?.email, completedIds]);

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
        const mapped = data.map((route) => {
          const normalized = normalizeFavoriteRoute(route);
          return {
            ...normalized,
            isCompleted:
              completedIds.has(normalized.id) || normalized.isCompleted,
          };
        });
        setFavorites(mapped);
        setFavoritesStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setFavoritesStatus("error");
        setFavoritesError(
          translateErrorMessage(err instanceof Error ? err.message : "Error al cargar las favoritas.")
        );
      }
    }

    fetchFavorites();
    return () => controller.abort();
  }, [accessToken, completedIds]);

  useEffect(() => {
    setFavorites((prev) =>
      prev.map((r) => ({
        ...r,
        isCompleted: completedIds.has(r.id) || r.isCompleted,
      }))
    );
    setCreatedRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        isCompleted: completedIds.has(r.id) || r.isCompleted,
      }))
    );
    setSelectedFavorite((prev) =>
      prev
        ? {
          ...prev,
          isCompleted: completedIds.has(prev.id) || prev.isCompleted,
        }
        : prev
    );
    setSelectedCreatedRoute((prev) =>
      prev
        ? {
          ...prev,
          isCompleted: completedIds.has(prev.id) || prev.isCompleted,
        }
        : prev
    );
  }, [completedIds]);

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
    if (!accessToken || !profile?.id) {
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
        if (!profile?.id) return;

        const profileId: string = profile.id;
        const res = await fetch(
          `${API_BASE}/users/${profileId}/followers?skip=0&limit=50`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "No se pudieron cargar los seguidores.");
        }

        const data = (await res.json()) as FollowerListAPI | FollowerAPI[];

        const rawItems: FollowerAPI[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : [];

        setFollowers(rawItems.map(normalizeFollower));
        setFollowersStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setFollowersStatus("error");
        setFollowersError(
          translateErrorMessage(err instanceof Error ? err.message : "Error al cargar los seguidores.")
        );
      }
    }

    fetchFollowers();
    return () => controller.abort();
  }, [accessToken, profile]);

  // ============= Siguiendo =============
  const [following, setFollowing] = useState<Follower[]>([]);
  const [followingStatus, setFollowingStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [followingError, setFollowingError] = useState("");
  // =======================================
  useEffect(() => {
    if (!accessToken || !profile?.id) {
      setFollowing([]);
      setFollowingStatus("idle");
      setFollowingError("");
      return;
    }

    if (!API_BASE) {
      setFollowingStatus("error");
      setFollowingError(
        "Configura VITE_API_URL para cargar la gente que sigues"
      );
      return;
    }

    const controller = new AbortController();
    setFollowingStatus("loading");
    setFollowingError("");

    async function fetchFollowing() {
      try {
        if (!profile?.id) return;

        const profileId: string = profile.id;
        const res = await fetch(
          `${API_BASE}/users/${profileId}/following?skip=0&limit=50`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(
            detail || "No se pudo cargar la lista de usuarios que sigues."
          );
        }
        const data = (await res.json()) as FollowerListAPI | FollowerAPI[];

        const rawItems: FollowerAPI[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : [];

        setFollowing(rawItems.map(normalizeFollower));
        setFollowingStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setFollowingStatus("error");
        setFollowingError(
          translateErrorMessage(err instanceof Error
            ? err.message
            : "Error al cargar la lista de usuarios a los que sigues.")
        );
      }
    }

    fetchFollowing();
    return () => controller.abort();
  }, [accessToken, profile]);

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
      // Sync unit preference to global context so all components update immediately
      setUnit(updated.preferred_units);
      setIsEditing(false);
    } catch (err) {
      setProfileError(
        translateErrorMessage(err instanceof Error ? err.message : "Error al guardar el perfil.")
      );
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleDeleteCreatedRoute = async (routeId: string) => {
    if (!accessToken) {
      return;
    }
    if (!API_BASE) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/routes/${routeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "No se pudo eliminar la ruta.");
      }
      setCreatedRoutes((prev) => prev.filter((route) => route.id !== routeId));
      setSelectedCreatedRoute(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar la ruta.");
    }
  };

  return (
    <div className="profile-root">
      <header className="primary-header profile-header">
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
                      navigate("/");
                    }}
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  className="profile-menu__item"
                  role="menuitem"
                  onClick={() => {
                    navigate("/descubrir");
                    setProfileMenuOpen(false);
                  }}
                >
                  Ir a descubrir
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="profile-layout">
        <section className="content">
          <PersonalData
            profile={profile}
            loadingProfile={profileStatus === "loading"}
            error={profileError}
            stats={profile?.stats ?? EMPTY_STATS}
            isEditing={isEditing}
            draftExtras={draftExtras}
            onChangeDraft={handleDraftChange}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            saving={isSaving}
            onAvatarFile={handleAvatarFile}
            followers={followers}
            onGoToFollowers={() => setActive("followers")}
            following={following}
            onGoToFollowing={() => setActive("following")}
            onGoToFavorites={() => setActive("favorites")}
            onGoToCreated={() => setActive("created")}
            activeTab={active}
            onChangeTab={setActive}
            onLogout={() => {
              logout();
              navigate("/");
            }}
          />
          {active === "favorites" && (
            <FavoritesPanel
              favorites={favorites}
              status={favoritesStatus}
              error={favoritesError}
              onViewRoute={handleSelectFavorite}
              selectedRoute={selectedFavorite}
              onCloseRoute={closeFavoriteView}
              onSavedChange={handleFavoriteSavedChange}
              onRatingChange={({ average, count }) => {
                if (!selectedFavorite) return;
                setFavorites((prev) =>
                  prev.map((r) =>
                    r.id === selectedFavorite.id
                      ? { ...r, rating: average, rating_count: count }
                      : r
                  )
                );
                setSelectedFavorite((prev) =>
                  prev && prev.id === selectedFavorite.id
                    ? { ...prev, rating: average, rating_count: count }
                    : prev
                );
              }}
              onCompletedChange={(next) => {
                if (!selectedFavorite) return;
                setFavorites((prev) =>
                  prev.map((r) =>
                    r.id === selectedFavorite.id
                      ? { ...r, isCompleted: next }
                      : r
                  )
                );
                setSelectedFavorite((prev) =>
                  prev && prev.id === selectedFavorite.id
                    ? { ...prev, isCompleted: next }
                    : prev
                );
                setAchievementsRefreshKey((prev) => prev + 1);
              }}
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
              onSavedChange={handleCreatedSavedChange}
              onRatingChange={({ average, count }) => {
                if (!selectedCreatedRoute) return;
                setCreatedRoutes((prev) =>
                  prev.map((r) =>
                    r.id === selectedCreatedRoute.id
                      ? { ...r, rating: average, rating_count: count }
                      : r
                  )
                );
                setSelectedCreatedRoute((prev) =>
                  prev && prev.id === selectedCreatedRoute.id
                    ? { ...prev, rating: average, rating_count: count }
                    : prev
                );
              }}
              onCompletedChange={(next) => {
                if (!selectedCreatedRoute) return;
                setCreatedRoutes((prev) =>
                  prev.map((r) =>
                    r.id === selectedCreatedRoute.id
                      ? { ...r, isCompleted: next }
                      : r
                  )
                );
                setSelectedCreatedRoute((prev) =>
                  prev && prev.id === selectedCreatedRoute.id
                    ? { ...prev, isCompleted: next }
                    : prev
                );
                setAchievementsRefreshKey((prev) => prev + 1);
              }}
              onDeleteRoute={handleDeleteCreatedRoute}
              initialSavedForRoute={(routeId) =>
                favorites.some((route) => route.id === routeId)
              }
            />
          )}
          {active === "followers" && (
            <FollowersPanel
              followers={followers}
              status={followersStatus}
              error={followersError}
            />
          )}
          {active === "following" && (
            <FollowingPanel
              following={following}
              status={followingStatus}
              error={followingError}
            />
          )}
          <div className="achievements-wrapper">
            <CompletedRoutesAchievements
              userId={profile?.id}
              refreshToken={achievementsRefreshKey}
            />
            <CreatedRoutesAchievements
              userId={profile?.id}
              refreshToken={achievementsRefreshKey}
            />
            <DistanceAchievementsBlock
              userId={profile?.id}
              refreshToken={achievementsRefreshKey}
            />
          </div>
          <ThemeAchievementsBlock
            userId={profile?.id}
            refreshToken={achievementsRefreshKey}
          />
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
    theme_preference:
      payload.theme_preference === "dark" || payload.theme_preference === "system"
        ? payload.theme_preference
        : "light",
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
      .map((point: any) => {
        if (Array.isArray(point) && point.length >= 2) {
          const [lng, lat] = point;
          return typeof lng === "number" && typeof lat === "number"
            ? [lng, lat]
            : null;
        }
        const lng =
          point?.longitude ??
          point?.lng ??
          point?.lon ??
          (Array.isArray(point?.coordinates) ? point.coordinates[0] : null);
        const lat =
          point?.latitude ??
          point?.lat ??
          point?.latitud ??
          (Array.isArray(point?.coordinates) ? point.coordinates[1] : null);
        if (typeof lng === "number" && typeof lat === "number") {
          return [lng, lat];
        }
        return null;
      })
      .filter((p): p is [number, number] => Array.isArray(p))
    : [];

  const createdAtRaw = (route as any)?.createdAt ?? route.created_at ?? null;
  const createdAt =
    typeof createdAtRaw === "string"
      ? createdAtRaw
      : createdAtRaw
        ? new Date(createdAtRaw).toISOString()
        : "";

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
    rating:
      typeof route.rating === "number"
        ? route.rating
        : route.user_rating ?? null,
    rating_count:
      typeof route.rating_count === "number"
        ? route.rating_count
        : typeof (route as any).ratingCount === "number"
          ? (route as any).ratingCount
          : null,
    user_rating:
      typeof route.user_rating === "number" ? route.user_rating : null,
    images: Array.isArray(route.images)
      ? route.images
      : Array.isArray((route as any).image_urls)
        ? (route as any).image_urls
        : Array.isArray((route as any).imageUrls)
          ? (route as any).imageUrls
          : [],
    isCompleted: normalizeCompletedFlag(
      route.is_completed ??
      route.completed ??
      route.isCompleted ??
      route.completed_by_user ??
      (route as any)?.completedByUser
    ),
    completedAt: route.completed_at ?? route.completedAt ?? null,
  };
}

// ============= Seguidores =============
type Follower = {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatarUrl?: string | null;
};

type FollowerAPI = {
  id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type FollowerListAPI = {
  items: FollowerAPI[];
  total: number;
};
// =======================================

function normalizeFollower(payload: FollowerAPI): Follower {
  return {
    id: payload.id,
    username: payload.username,
    name: payload.name ?? payload.username,
    email: payload.email ?? "",
    avatarUrl: payload.avatar_url ?? null,
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
  onSaveEdit: () => void | Promise<void>;
  saving: boolean;
  onAvatarFile: (file: File | null) => void;
  followers: Follower[];
  onGoToFollowers: () => void;
  following: Follower[];
  onGoToFollowing: () => void;
  onGoToFavorites: () => void;
  onGoToCreated: () => void;
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onLogout: () => void;
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
  onSaveEdit,
  saving,
  onAvatarFile,
  followers,
  onGoToFollowers,
  following,
  onGoToFollowing,
  onGoToFavorites,
  onGoToCreated,
  activeTab,
  onChangeTab,
  onLogout,
}: PersonalDataProps) {
  const { theme, resolvedTheme, setThemePreference, isUpdating: savingTheme } = useTheme();
  const viewExtras = isEditing ? draftExtras : createDraftFromProfile(profile);
  const username = profile?.username ?? "";
  const email = profile?.email ?? "";
  const displayName = username || email || "Explorador";
  const subtitle = email || "Completa tu email para compartir rutas";
  const phoneLabel =
    viewExtras.phone || "Añade tu teléfono para que puedan contactarte";
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const handleEditAction = async () => {
    if (!profile || loadingProfile) return;
    if (!isEditing) {
      onStartEdit();
      return;
    }
    await onSaveEdit();
  };

  const handleAvatarClick = () => {
    if (!isEditing) return;
    avatarInputRef.current?.click();
  };
  const showPhonePill = Boolean(viewExtras.phone);
  const handleThemeChange = (next: ThemePref) => {
    if (next === theme) return;
    void setThemePreference(next);
  };

  return (
    <div className="card fill profile-panel">
      <div className="profile-hero-card">
        <div className="profile-hero-banner">
          <button
            className="pill-btn primary hero-edit-fab"
            type="button"
            onClick={handleEditAction}
            disabled={!profile || loadingProfile || saving}
          >
            {isEditing
              ? saving
                ? "Guardando..."
                : "Guardar perfil"
              : "Editar perfil"}
          </button>
        </div>
        <div className="profile-hero-body">
          <input
            ref={avatarInputRef}
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
          <div
            className={`profile-hero-avatar ${isEditing ? "editable" : ""}`}
            role={isEditing ? "button" : undefined}
            tabIndex={isEditing ? 0 : -1}
            onClick={handleAvatarClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleAvatarClick();
              }
            }}
          >
            {viewExtras.avatarUrl ? (
              <img src={viewExtras.avatarUrl} alt="Avatar del usuario" />
            ) : (
              <span>{displayName?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          {isEditing && viewExtras.avatarUrl && (
            <button
              className="pill-btn ghost sm avatar-remove-btn"
              type="button"
              onClick={() => onAvatarFile(null)}
            >
              Quitar foto
            </button>
          )}
          <div className="profile-hero-info">
            <p className="profile-hero-name">{displayName}</p>
            <p className="profile-hero-subtitle">{subtitle}</p>
            <div className="profile-hero-tags">
              {showPhonePill ? (
                <span className="pill soft">{phoneLabel}</span>
              ) : null}
            </div>
          </div>

          <div className="profile-hero-actions profile-hero-actions--row">
            <button className="ig-pill" type="button" onClick={onGoToFollowers}>
              <span className="ig-pill__count">{followers.length}</span>
              <span className="ig-pill__label">Seguidores</span>
            </button>
            <button className="ig-pill" type="button" onClick={onGoToFollowing}>
              <span className="ig-pill__count">{following.length}</span>
              <span className="ig-pill__label">Siguiendo</span>
            </button>
          </div>

          <div className="profile-hero-stats profile-hero-stats--rows">
            <div className="hero-stat-pair">
              <button
                className="hero-stat"
                type="button"
                onClick={onGoToCreated}
              >
                <span className="hero-stat__value">{stats.routes_created}</span>
                <span className="hero-stat__label">Rutas creadas</span>
              </button>
              <button
                className="hero-stat"
                type="button"
                onClick={onGoToFavorites}
              >
                <span className="hero-stat__value">
                  {stats.routes_favorites}
                </span>
                <span className="hero-stat__label">Rutas favoritas</span>
              </button>
            </div>
          </div>
          <div className="theme-toggle">
            <div className="theme-toggle__header">
              <span className="info-label">Tema</span>
              <span className="theme-toggle__status">
                {savingTheme
                  ? "Guardando..."
                  : resolvedTheme === "dark"
                    ? "Oscuro activo"
                    : "Claro activo"}
              </span>
            </div>
            <div
              className="theme-toggle__controls"
              role="group"
              aria-label="Preferencia de tema"
            >
              <button
                type="button"
                className={`theme-chip ${theme === "light" ? "active" : ""}`}
                onClick={() => handleThemeChange("light")}
                aria-pressed={theme === "light"}
              >
                Modo claro
              </button>
              <button
                type="button"
                className={`theme-chip ${theme === "dark" ? "active" : ""}`}
                onClick={() => handleThemeChange("dark")}
                aria-pressed={theme === "dark"}
              >
                Modo oscuro
              </button>
              <button
                type="button"
                className={`theme-chip ${theme === "system" ? "active" : ""}`}
                onClick={() => handleThemeChange("system")}
                aria-pressed={theme === "system"}
              >
                Automático
              </button>
            </div>
            <p className="muted theme-toggle__hint">
              Se aplica en toda la web y se guarda en tu perfil.
            </p>
          </div>
        </div>
        {!isEditing && (
          <div className="profile-logout-bar">
            <button
              className="pill-btn logout"
              type="button"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="profile-details-grid">
        <div className="glass-card">
          <div className="panel-header compact">
            <div>
              <h3>Datos de la cuenta</h3>
              <p>Gestiona cómo te ven los demás en la app</p>
            </div>
          </div>

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
            <div className="info-row editable">
              <label className="info-label" htmlFor="phone-input">
                Teléfono de contacto
              </label>
              {isEditing ? (
                <input
                  id="phone-input"
                  className="input"
                  value={viewExtras.phone}
                  onChange={(event) =>
                    onChangeDraft({ phone: event.target.value })
                  }
                  placeholder="Ej: +34 600 000 000"
                />
              ) : (
                <span className="info-value">
                  {viewExtras.phone || "No has añadido un teléfono"}
                </span>
              )}
            </div>

            <div className="info-row editable">
              <span className="info-label">Unidades preferidas</span>
              {isEditing ? (
                <div className="unit-options">
                  <label
                    className={`unit-chip ${viewExtras.units === "km" ? "selected" : ""
                      }`}
                  >
                    <input
                      type="radio"
                      name="units"
                      value="km"
                      checked={viewExtras.units === "km"}
                      onChange={() => onChangeDraft({ units: "km" })}
                    />
                    <span>Km</span>
                  </label>
                  <label
                    className={`unit-chip ${viewExtras.units === "mi" ? "selected" : ""
                      }`}
                  >
                    <input
                      type="radio"
                      name="units"
                      value="mi"
                      checked={viewExtras.units === "mi"}
                      onChange={() => onChangeDraft({ units: "mi" })}
                    />
                    <span>Millas</span>
                  </label>
                </div>
              ) : (
                <span className="info-value">
                  {viewExtras.units === "mi"
                    ? "Mostrando distancias en millas"
                    : "Mostrando distancias en kilómetros"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-inline-nav secondary-nav">
        <button
          className={`inline-nav-btn ${activeTab === "created" ? "active" : ""
            }`}
          onClick={() => onChangeTab("created")}
        >
          Mis rutas
        </button>
        <button
          className={`inline-nav-btn ${activeTab === "favorites" ? "active" : ""
            }`}
          onClick={() => onChangeTab("favorites")}
        >
          Favoritas
        </button>
        <button
          className={`inline-nav-btn ${activeTab === "followers" ? "active" : ""
            }`}
          onClick={() => onChangeTab("followers")}
        >
          Seguidores
        </button>
        <button
          className={`inline-nav-btn ${activeTab === "following" ? "active" : ""
            }`}
          onClick={() => onChangeTab("following")}
        >
          Siguiendo
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
  onSavedChange: (saved: boolean) => void;
  onRatingChange: (stats: { average: number | null; count: number }) => void;
  onCompletedChange: (completed: boolean) => void;
};

function FavoritesPanel({
  favorites,
  status,
  error,
  selectedRoute,
  onViewRoute,
  onCloseRoute,
  onSavedChange,
  onRatingChange,
  onCompletedChange,
}: FavoritesPanelProps) {
  if (selectedRoute) {
    const ownerLabel = selectedRoute.ownerName || selectedRoute.ownerId;
    return (
      <div className="card fill route-details-inline">
        <div className="route-details-map-shell">
          <header className="route-details-map__header">
            <div>
              <p className="eyebrow">Mapa de la ruta</p>
              <h3>{selectedRoute.name}</h3>
              <p className="muted">
                Propietario <strong>{ownerLabel}</strong> · Creada el{" "}
                {formatDateLabel(selectedRoute.createdAt)}
              </p>
            </div>
            <button className="btn-ghost" type="button" onClick={onCloseRoute}>
              Cerrar
            </button>
          </header>
          <div className="route-details-map__body">
            <MapView
              className="route-details-map"
              highlightPoints={selectedRoute.points}
              fitOnHighlight
            />
          </div>
        </div>

        <RouteDetailsCard
          routeId={selectedRoute.id}
          name={selectedRoute.name}
          description={selectedRoute.description || "Sin descripción"}
          category={(selectedRoute.category as Category) || "entretenimiento"}
          points={selectedRoute.points}
          distanceKm={
            (selectedRoute as any).distanceKm ??
            (selectedRoute as any).distance_km ??
            null
          }
          durationMinutes={
            (selectedRoute as any).durationMinutes ??
            (selectedRoute as any).duration_minutes ??
            null
          }
          difficulty={(selectedRoute as any).difficulty ?? null}
          isPrivate={!selectedRoute.visibility}
          rating={selectedRoute.rating ?? null}
          ratingCount={selectedRoute.rating_count ?? null}
          initialCompleted={normalizeCompletedFlag(
            selectedRoute.isCompleted ?? false
          )}
          onCompletedChange={onCompletedChange}
          onRatingChange={onRatingChange}
          onClose={onCloseRoute}
          initialSaved
          onSavedChange={onSavedChange}
        />
      </div>
    );
  }

  const hasFavorites = favorites.length > 0;

  const favoriteItems = favorites.map((route) => (
    <div className="route-row" key={route.id}>
      <RoutePreviewCard
        id={route.id}
        name={route.name}
        category={route.category as Category}
        points={route.points}
        images={route.images}
        ratingAverage={route.rating ?? null}
        ratingCount={route.rating_count ?? null}
        isCompleted={normalizeCompletedFlag(route.isCompleted ?? false)}
        initialSaved
        onSavedChange={onSavedChange}
        onClick={() => onViewRoute(route)}
      />
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
  onSavedChange: (saved: boolean) => void;
  onRatingChange: (stats: { average: number | null; count: number }) => void;
  onCompletedChange: (completed: boolean) => void;
  onDeleteRoute: (routeId: string) => Promise<void>;
  initialSavedForRoute: (routeId: string) => boolean;
};

function CreatedRoutesPanel({
  routes,
  status,
  error,
  selectedRoute,
  onViewRoute,
  onCloseRoute,
  onSavedChange,
  onRatingChange,
  onCompletedChange,
  onDeleteRoute,
  initialSavedForRoute,
}: CreatedRoutesPanelProps) {
  if (selectedRoute) {
    const ownerLabel = selectedRoute.ownerName || selectedRoute.ownerId;
    return (
      <div className="card fill route-details-inline">
        <div className="route-details-map-shell">
          <header className="route-details-map__header">
            <div>
              <p className="eyebrow">Mapa de la ruta</p>
              <h3>{selectedRoute.name}</h3>
              <p className="muted">
                Propietario <strong>{ownerLabel}</strong> · Creada el{" "}
                {formatDateLabel(selectedRoute.createdAt)}
              </p>
            </div>
            <div className="route-details-map__actions">
              <button className="btn-ghost" type="button" onClick={onCloseRoute}>
                Cerrar
              </button>
            </div>
          </header>
          <div className="route-details-map__body">
            <MapView
              className="route-details-map"
              highlightPoints={selectedRoute.points}
              fitOnHighlight
            />
          </div>
        </div>

        <RouteDetailsCard
          routeId={selectedRoute.id}
          name={selectedRoute.name}
          description={selectedRoute.description || "Sin descripción"}
          category={(selectedRoute.category as Category) || "entretenimiento"}
          points={selectedRoute.points}
          distanceKm={
            (selectedRoute as any).distanceKm ??
            (selectedRoute as any).distance_km ??
            null
          }
          durationMinutes={
            (selectedRoute as any).durationMinutes ??
            (selectedRoute as any).duration_minutes ??
            null
          }
          difficulty={(selectedRoute as any).difficulty ?? null}
          isPrivate={!selectedRoute.visibility}
          rating={selectedRoute.rating ?? null}
          ratingCount={selectedRoute.rating_count ?? null}
          initialCompleted={normalizeCompletedFlag(
            selectedRoute.isCompleted ?? false
          )}
          onCompletedChange={onCompletedChange}
          onRatingChange={onRatingChange}
          onClose={onCloseRoute}
          initialSaved={initialSavedForRoute(selectedRoute.id)}
          onSavedChange={onSavedChange}
          onDelete={async (routeId) => {
            await onDeleteRoute(routeId);
          }}
          isOwnRoute
        />
      </div>
    );
  }

  const hasRoutes = routes.length > 0;

  const createdItems = routes.map((route) => (
    <div className="route-row" key={route.id}>
      <RoutePreviewCard
        id={route.id}
        name={route.name}
        category={route.category as Category}
        points={route.points}
        images={route.images}
        ratingAverage={route.rating ?? null}
        ratingCount={route.rating_count ?? null}
        isCompleted={normalizeCompletedFlag(route.isCompleted ?? false)}
        initialSaved={initialSavedForRoute(route.id)}
        onSavedChange={onSavedChange}
        onClick={() => onViewRoute(route)}
      />
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

  if (status === "loading" && followers.length === 0) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Seguidores</h2>
          <p>Personas que siguen tus rutas y actividad</p>
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

  if (followers.length === 0) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Seguidores</h2>
          <p>Personas que siguen tus rutas y actividad</p>
        </div>
        <p className="muted">Todavía no tienes seguidores</p>
      </div>
    );
  }

  const followerItems = followers.map((follower) => (
    <div className="user-row" key={follower.id}>
      <UserPreviewCard
        id={follower.id}
        username={follower.username}
        email={follower.email ?? ""}
        name={follower.name}
        avatar_url={follower.avatarUrl ?? defaultAvatar}
      />
    </div>
  ));

  const handleSelectFollower = (index: number) => {
    const follower = followers[index];
    if (!follower) return;

    navigate("/mapa", {
      state: {
        openUserFromFollowers: {
          id: follower.id,
          username: follower.username,
          name: follower.name,
          email: follower.email ?? "",
          avatar_url: follower.avatarUrl ?? null,
        },
      },
    });
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

type FollowingPanelProps = {
  following: Follower[];
  status: "idle" | "loading" | "error";
  error: string;
};

function FollowingPanel({ following, status, error }: FollowingPanelProps) {
  const navigate = useNavigate();

  if (status === "loading" && following.length === 0) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Siguiendo</h2>
          <p>Personas a las que sigues</p>
        </div>
        <p className="muted">Cargando lista…</p>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Siguiendo</h2>
          <p>Personas a las que sigues</p>
        </div>
        <div className="alert error">{error}</div>
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="card fill">
        <div className="section-title">
          <h2>Siguiendo</h2>
          <p>Personas a las que sigues</p>
        </div>
        <p className="muted">Todavía no sigues a nadie.</p>
      </div>
    );
  }

  const followingItems = following.map((user) => (
    <div className="user-row" key={user.id}>
      <UserPreviewCard
        id={user.id}
        username={user.username}
        email={user.email ?? ""}
        name={user.name}
        avatar_url={user.avatarUrl ?? defaultAvatar}
      />
    </div>
  ));

  const handleSelectFollowing = (index: number) => {
    const user = following[index];
    if (!user) return;

    navigate("/mapa", {
      state: {
        openUserFromFollowers: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email ?? "",
          avatar_url: user.avatarUrl ?? null,
        },
      },
    });
  };

  return (
    <div className="card fill">
      <div className="section-title">
        <h2>Siguiendo</h2>
        <p>Personas a las que sigues</p>
      </div>

      <AnimatedList
        items={followingItems}
        className="followers-animated-list"
        itemClassName="followers-animated-item"
        showGradients
        onItemSelect={handleSelectFollowing}
      />
    </div>
  );
}
