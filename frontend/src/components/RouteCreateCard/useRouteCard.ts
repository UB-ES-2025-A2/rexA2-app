import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import type { Category, Mode } from "../types";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";

const API = import.meta.env.VITE_API_URL || window.location.origin;
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

export function useRouteCard({
  modeDefault,
  drawPoints,
  onResetPoints,
  onClose,
  initialImages = [],
}: {
  modeDefault: Mode;
  drawPoints: Array<[number, number]>;
  onResetPoints?: () => void;
  onClose?: () => void;
  initialImages?: string[];
}) {
  const { token } = useAuth();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<Mode>(modeDefault);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">(
    PUBLIC_CATEGORIES[0] ?? ""
  );
  const [isPrivate, setIsPrivate] = useState(true);
  const [difficulty, setDifficulty] = useState<"" | "easy" | "medium" | "hard">("");
  const [searchPoints, setSearchPoints] = useState<Array<[number, number]>>([]);
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const [nameTooLong, setNameTooLong] = useState(false);
  const [images, setImages] = useState<
    { id: string; url: string; name: string; size?: number }[]
  >(() =>
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

  useEffect(() => {
    if (mode !== "search") {
      try {
        geocoderInstance.current?.clear();
      } catch {}
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
      placeholder: "Busca un sitio para añadir…",
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
      } catch {}
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
  };

  const addSearchPoint = () => {
    if (!selectedCoord) return;
    setSearchPoints((prev) => [...prev, selectedCoord]);
    try {
      geocoderInstance.current?.clear();
    } catch {}
    setSelectedCoord(null);
  };

  const removeSearchPoint = (idx: number) =>
    setSearchPoints((p) => p.filter((_, i) => i !== idx));

  const clearSearchPoints = () => {
    setSearchPoints([]);
    setSelectedCoord(null);
    try {
      geocoderInstance.current?.clear();
    } catch {}
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    if (m === "search") onResetPoints?.();
    else clearSearchPoints();
  };

  useEffect(() => {
    const normalized = (initialImages ?? []).map((url, idx) => ({
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
    const points = mode === "draw" ? drawPoints : searchPoints;

    if (points.length < 3) {
      showAlert("Mínimo se han de seleccionar 3 puntos de interés", "error");
      return;
    }
    if (!name.trim()) {
      showAlert("Falta añadir nombre a la ruta", "error");
      return;
    }
    if (name.trim().length > 30) {
      showAlert("El nombre de la ruta debe tener menos de 30 caracteres", "error");
      return;
    }

    // Se comprueba unicidad de la ruta
    const exists = await checkRouteNameExists(name);
    if (exists) {
      showAlert("Este nombre de ruta ya existe", "error");
      return;
    }

    if (!description.trim()) {
      showAlert("Falta añadir una descripción a la ruta", "error");
      return;
    }
    if (!category) {
      showAlert("No se ha seleccionado ninguna categoría", "error");
      return;
    }
    if (images.length > MAX_IMAGES) {
      showAlert(`Máximo ${MAX_IMAGES} imágenes por ruta.`, "error");
      return;
    }
    if (!difficulty) {
      showAlert("Selecciona una dificultad para la ruta", "error");
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
      visibility: !isPrivate,
      category: category as Category,
      images: images.map((img) => img.url),
      difficulty,
    };

    try {
      const res = await fetch(`${API}/routes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      try {
        console.log("Ruta enviada:", await res.json());
      } catch {
        console.log("Ruta enviada (sin JSON)");
      }

      showAlert("Ruta creada correctamente", "success");

      onClose?.();
    } catch (e) {
      console.error(e);
      showAlert("No se pudo guardar la ruta.", "error");
    }
  };

  return {
    viewProps: {
      mode,
      name,
      description,
      isPrivate,
      category,
      images,
      categoryOptions: PUBLIC_CATEGORIES,

      geocoderRef,
      searchPoints,
      drawPoints,
      selectedCoord,
      onChangeName,
      onTogglePrivate: setIsPrivate,
      onChangeCategory: (v: Category | "") => setCategory(v),
      onChangeDescription: setDescription,
      difficulty,
      onChangeDifficulty: setDifficulty,
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
          showAlert(`Máximo ${MAX_IMAGES} imágenes por ruta.`, "error");
          return;
        }
        const candidates = Array.from(files).slice(0, availableSlots);
        const accepted: { id: string; url: string; name: string; size?: number }[] = [];

        for (const file of candidates) {
          if (!file.type.startsWith("image/")) {
            showAlert(`El archivo ${file.name} no es una imagen válida.`, "error");
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
        }
      },
      onRemoveImage: (id: string) =>
        setImages((prev) => prev.filter((img) => img.id !== id)),
    },
  } as const;
}
