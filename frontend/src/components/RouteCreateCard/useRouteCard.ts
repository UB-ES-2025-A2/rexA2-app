import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import type { Category, Mode } from "../types";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { getApiBaseUrl } from "../../services/api";

const API = getApiBaseUrl();
const PUBLIC_CATEGORIES: Category[] = [
  "gastronomia",
  "naturaleza",
  "aventura",
  "cultura",
  "deporte",
  "historia",
  "urban",
  "entretenimiento",
  "otros",
];

type ImageItem = { id: string; url: string; name: string; size?: number };
type ErrorBag = Record<string, string>;

export function useRouteCard({
  modeDefault,
  drawPoints,
  onResetPoints,
  onClose,
  initialImages,
}: {
  modeDefault: Mode;
  drawPoints: Array<[number, number]>;
  onResetPoints?: () => void;
  onClose?: () => void;
  initialImages?: string[];
}) {
  const { token } = useAuth();
  const { showAlert } = useAlert();

  const [errors, setErrors] = useState<ErrorBag>({});
  const [generalError, setGeneralError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<Mode>(modeDefault);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">(PUBLIC_CATEGORIES[0] ?? "");

  const [difficulty, setDifficulty] = useState<"" | "easy" | "medium" | "hard">("");
  const [searchPoints, setSearchPoints] = useState<Array<[number, number]>>([]);
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const [nameTooLong, setNameTooLong] = useState(false);
  const [images, setImages] = useState<ImageItem[]>(() =>
    (initialImages ?? []).map((url, idx) => ({
      id: `initial-${idx}`,
      url,
      name: `Imagen ${idx + 1}`,
    }))
  );
  const geocoderRef = useRef<HTMLDivElement | null>(null);
  const geocoderInstance = useRef<MapboxGeocoder | null>(null);
  const MAX_IMAGES = 10;
  const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

  const clearFieldError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  useEffect(() => {
    if (mode !== "search") {
      try {
        geocoderInstance.current?.clear();
      } catch { }
      geocoderInstance.current = null;
      if (geocoderRef.current) geocoderRef.current.innerHTML = "";
      setSelectedCoord(null);
      return;
    }

    if (!geocoderRef.current || geocoderInstance.current) return;

    const geocoder = new MapboxGeocoder({
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: "Busca un sitio para anadir puntos",
    });

    geocoder.addTo(geocoderRef.current);
    geocoder.on("result", (e: any) =>
      setSelectedCoord((e?.result?.center as [number, number]) ?? null)
    );
    geocoder.on("clear", () => setSelectedCoord(null));
    geocoderInstance.current = geocoder;

    return () => {
      try {
        geocoder.clear();
      } catch { }
      geocoderInstance.current = null;
      if (geocoderRef.current) geocoderRef.current.innerHTML = "";
    };
  }, [mode]);

  const onChangeName = (v: string) => {
    if ((v ?? "").length > 30) {
      setName((v ?? "").slice(0, 30));
      setNameTooLong(true);
    } else {
      setName(v ?? "");
      setNameTooLong(false);
    }
    setGeneralError("");
    clearFieldError("name");
  };

  const onChangeDescription = (v: string) => {
    setDescription(v ?? "");
    setGeneralError("");
    clearFieldError("description");
  };

  const onChangeCategory = (v: Category | "") => {
    setCategory(v);
    setGeneralError("");
    clearFieldError("category");
  };

  const onChangeDifficulty = (v: "" | "easy" | "medium" | "hard") => {
    setDifficulty(v);
    setGeneralError("");
    clearFieldError("difficulty");
  };

  const addSearchPoint = () => {
    if (!selectedCoord) return;
    setSearchPoints((prev) => [...prev, selectedCoord]);
    clearFieldError("points");
    try {
      geocoderInstance.current?.clear();
    } catch { }
    setSelectedCoord(null);
  };

  const removeSearchPoint = (idx: number) =>
    setSearchPoints((p) => p.filter((_, i) => i !== idx));

  const clearSearchPoints = () => {
    setSearchPoints([]);
    setSelectedCoord(null);
    clearFieldError("points");
    try {
      geocoderInstance.current?.clear();
    } catch { }
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    setGeneralError("");
    clearFieldError("points");
    if (m === "search") onResetPoints?.();
    else clearSearchPoints();
  };

  useEffect(() => {
    if (!initialImages || initialImages.length === 0) return;
    const normalized = initialImages.map((url, idx) => ({
      id: `initial-${idx}`,
      url,
      name: `Imagen ${idx + 1}`,
    }));
    // Evita bucles de render si el contenido no cambia (p.ej. cuando se pasa [] inline)
    setImages((prev) => {
      const sameLength = prev.length === normalized.length;
      const sameUrls =
        sameLength &&
        prev.every((img, i) => img.url === normalized[i]?.url && img.id.startsWith("initial-"));
      return sameUrls ? prev : normalized;
    });
  }, [initialImages]);

  const checkRouteNameExists = async (routeName: string) => {
    try {
      const res = await fetch(`${API}/routes/by-name/${encodeURIComponent(routeName.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setGeneralError("");
    setErrors({});
    const points = mode === "draw" ? drawPoints : searchPoints;
    const nextErrors: ErrorBag = {};

    if (points.length < 3) {
      nextErrors.points = "Anade al menos 3 puntos para definir la ruta.";
    }
    if (!name.trim()) {
      nextErrors.name = "Ponle un nombre a la ruta.";
    } else if (name.trim().length > 30) {
      nextErrors.name = "El nombre debe tener menos de 30 caracteres.";
    }
    if (!description.trim()) {
      nextErrors.description = "Describe brevemente la ruta.";
    }
    if (!category) {
      nextErrors.category = "Selecciona una tematica.";
    }
    if (images.length > MAX_IMAGES) {
      nextErrors.images = `Maximo ${MAX_IMAGES} imagenes por ruta.`;
    }
    if (!difficulty) {
      nextErrors.difficulty = "Selecciona la dificultad.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setGeneralError("Revisa los campos marcados antes de guardar la ruta.");
      showAlert("Faltan datos obligatorios en el formulario.", "error");
      return;
    }

    // Se comprueba unicidad de la ruta
    const exists = await checkRouteNameExists(name.trim());
    if (exists) {
      setErrors({ name: "Este nombre de ruta ya existe, prueba con otro." });
      setGeneralError("Ese nombre ya esta utilizado por otra ruta.");
      showAlert("Este nombre de ruta ya existe", "error");
      return;
    }

    const formattedPoints = points.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    const payload = {
      name: name.trim(),
      description: description.trim(),
      points: formattedPoints,
      visibility: true,
      category: category as Category,
      images: images.map((img) => img.url),
      difficulty,
    };

    try {
      setIsSaving(true);
      const res = await fetch(`${API}/routes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = (resJson as any)?.detail || "No se pudo guardar la ruta. Revisa que estes autenticado.";
        setGeneralError(typeof detail === "string" ? detail : "No se pudo guardar la ruta.");
        showAlert(detail, "error");
        return;
      }

      if (Array.isArray((resJson as any)?.newly_unlocked)) {
        (resJson as any).newly_unlocked.forEach((ach: any) => {
          const prefix = ach?.icon ? `${ach.icon} ` : "";
          const achName = ach?.name || "Logro desbloqueado";
          showAlert(`${prefix}${achName}`, "success");
        });
      }

      showAlert("Ruta creada correctamente", "success");
      onClose?.();
    } catch (e) {
      console.error(e);
      setGeneralError("No se pudo guardar la ruta. Intentalo de nuevo.");
      showAlert("No se pudo guardar la ruta.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    viewProps: {
      mode,
      name,
      description,
      category,
      images,
      errors,
      generalError,
      isSaving,
      categoryOptions: PUBLIC_CATEGORIES,

      geocoderRef,
      searchPoints,
      drawPoints,
      selectedCoord,
      onChangeName,
      onChangeCategory,
      onChangeDescription,
      difficulty,
      onChangeDifficulty,
      onChangeMode: changeMode,
      onAddSearchPoint: addSearchPoint,
      onClearSearchPoints: clearSearchPoints,
      onRemoveSearchPoint: removeSearchPoint,
      onResetDrawPoints: onResetPoints,
      onSave: handleSave,
      nameTooLong,
      onSelectImages: async (files: FileList | null) => {
        if (!files) return;
        const currentCount = images.length;
        const availableSlots = MAX_IMAGES - currentCount;
        if (availableSlots <= 0) {
          const message = `Maximo ${MAX_IMAGES} imagenes por ruta.`;
          setErrors((prev) => ({ ...prev, images: message }));
          showAlert(message, "error");
          return;
        }
        const candidates = Array.from(files).slice(0, availableSlots);
        const accepted: ImageItem[] = [];

        for (const file of candidates) {
          if (!file.type.startsWith("image/")) {
            showAlert(`El archivo ${file.name} no es una imagen valida.`, "error");
            continue;
          }
          if (file.size > MAX_IMAGE_SIZE_BYTES) {
            showAlert(`'${file.name}' supera los 2 MB.`, "error");
            continue;
          }
          try {
            const url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") resolve(reader.result);
                else reject(new Error("Formato de imagen no soportado"));
              };
              reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
              reader.readAsDataURL(file);
            });
            accepted.push({
              id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              url,
              name: file.name,
              size: file.size,
            });
          } catch (err) {
            console.error("Error leyendo imagen", err);
            showAlert(`No se pudo leer '${file.name}'.`, "error");
          }
        }

        if (accepted.length) {
          setImages((prev) => [...prev, ...accepted]);
          clearFieldError("images");
          setGeneralError("");
        }
      },
      onRemoveImage: (id: string) =>
        setImages((prev) => prev.filter((img) => img.id !== id)),
    },
  } as const;
}
