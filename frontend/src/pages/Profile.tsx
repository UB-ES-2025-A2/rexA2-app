import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";
import RouteDetailsCard from "../components/RouteViewCard/RouteDetailsCard";
import type { Category } from "../components/types";
import AnimatedList from "../components/AnimatedList";
import RoutePreviewCard from "../components/RoutePreviewCard/RoutePreviewCard";
import defaultAvatar from "../assets/profile_pic.png";
import UserPreviewCard from "../components/UserViewCard/UserPreviewCard";

type TabKey = "profile" | "favorites" | "created" | "followers" | "following";
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
  rating?: number | null;
  rating_count?: number | null;
  user_rating?: number | null;
  images?: string[];
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

export default function Profile() {
  const [active, setActive] = useState<TabKey>("profile");
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
          err instanceof Error ? err.message : "Error al cargar los seguidores."
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
          err instanceof Error
            ? err.message
            : "Error al cargar la lista de usuarios a los que sigues."
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
      <header className="header">
        <div className="header__inner">
          <div className="header-left">
            <button
              aria-label="Ir al inicio"
              onClick={() => navigate("/")}
              className="btn-home"
            ></button>
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
                else navigate("/");
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
                    navigate("/perfil");
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
          className={`sidebar ${showFavoriteRoute || showCreatedRoute ? "sidebar-route-open" : ""
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
              distanceKm={
                (selectedFavorite as any).distanceKm ??
                (selectedFavorite as any).distance_km ??
                null
              }
              durationMinutes={
                (selectedFavorite as any).durationMinutes ??
                (selectedFavorite as any).duration_minutes ??
                null
              }
              difficulty={(selectedFavorite as any).difficulty ?? null}
              isPrivate={!selectedFavorite.visibility}
              rating={selectedFavorite.rating ?? null}
              ratingCount={selectedFavorite.rating_count ?? null}
              onRatingChange={({ average, count }) => {
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
              distanceKm={
                (selectedCreatedRoute as any).distanceKm ??
                (selectedCreatedRoute as any).distance_km ??
                null
              }
              durationMinutes={
                (selectedCreatedRoute as any).durationMinutes ??
                (selectedCreatedRoute as any).duration_minutes ??
                null
              }
              difficulty={(selectedCreatedRoute as any).difficulty ?? null}
              isPrivate={!selectedCreatedRoute.visibility}
              rating={selectedCreatedRoute.rating ?? null}
              ratingCount={selectedCreatedRoute.rating_count ?? null}
              onRatingChange={({ average, count }) => {
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
              onClose={closeCreatedView}
              initialSaved={favorites.some(
                (route) => route.id === selectedCreatedRoute.id
              )}
              onSavedChange={handleCreatedSavedChange}
              onDelete={handleDeleteCreatedRoute}
              isOwnRoute={true}
            />
          ) : (
            <ul className="menu">
              <li>
                <button
                  className={`btn ${active === "profile" ? "active" : ""}`}
                  onClick={() => setActive("profile")}
                >
                  <span className="label">Perfil</span>
                </button>
              </li>
              <li>
                <button
                  className={`btn ${active === "favorites" ? "active" : ""}`}
                  onClick={() => setActive("favorites")}
                >
                  <span className="label">Favoritas</span>
                </button>
              </li>
              <li>
                <button
                  className={`btn ${active === "created" ? "active" : ""}`}
                  onClick={() => setActive("created")}
                >
                  <span className="label">Mis rutas</span>
                </button>
              </li>
              <li>
                <button
                  className={`btn ${active === "followers" ? "active" : ""}`}
                  onClick={() => setActive("followers")}
                >
                  <span className="label">Seguidores</span>
                </button>
              </li>
              <li>
                <button
                  className={`btn ${active === "following" ? "active" : ""}`}
                  onClick={() => setActive("following")}
                >
                  <span className="label">Siguiendo</span>
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
              followers={followers}
              onGoToFollowers={() => setActive("followers")}
              following={following}
              onGoToFollowing={() => setActive("following")}
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
          {active === "following" && (
            <FollowingPanel
              following={following}
              status={followingStatus}
              error={followingError}
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
  onCancelEdit: () => void;
  onSaveEdit: () => void | Promise<void>;
  saving: boolean;
  onAvatarFile: (file: File | null) => void;
  avatarError: string;
  followers: Follower[];
  onGoToFollowers: () => void;
  following: Follower[];
  onGoToFollowing: () => void;
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
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  saving,
  onAvatarFile,
  avatarError,
  followers,
  onGoToFollowers,
  following,
  onGoToFollowing,
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

      <div className="profile-top">
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

        <div className="profile-top-main">
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

          <div className="profile-widgets">{/* extras ocultos */}</div>
        </div>
      </div>

      <div className="stats-summary">
        <button type="button" className="stats-card" onClick={onGoToFollowers}>
          <span className="stat-value">{followers.length}</span>
          <span className="stat-label">
            {followers.length === 1 ? "Seguidor" : "Seguidores"}
          </span>
        </button>
        <button type="button" className="stats-card" onClick={onGoToFollowing}>
          <span className="stat-value">{following.length}</span>
          <span className="stat-label">Siguiendo</span>
        </button>
      </div>

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
    <div className="route-row" key={route.id}>
      <RoutePreviewCard
        id={route.id}
        name={route.name}
        category={route.category as Category}
        points={route.points}
        images={route.images}
        ratingAverage={route.rating ?? null}
        ratingCount={route.rating_count ?? null}
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
    <div className="route-row" key={route.id}>
      <RoutePreviewCard
        id={route.id}
        name={route.name}
        category={route.category as Category}
        points={route.points}
        images={route.images}
        ratingAverage={route.rating ?? null}
        ratingCount={route.rating_count ?? null}
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

    navigate("/", {
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

    navigate("/", {
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
