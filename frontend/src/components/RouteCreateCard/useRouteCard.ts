import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import type { Category, Mode } from "../types";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL;


export function useRouteCard({
  modeDefault,
  drawPoints,
  onResetPoints,
  onClose,
  
}: {
  
  modeDefault: Mode;
  drawPoints: Array<[number, number]>;
  onResetPoints?: () => void;
  onClose?: () => void;
}) {
  
  const { token } = useAuth();
  const [mode, setMode] = useState<Mode>(modeDefault);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [searchPoints, setSearchPoints] = useState<Array<[number, number]>>([]);
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const [nameTooLong, setNameTooLong] = useState(false);
  const geocoderRef = useRef<HTMLDivElement | null>(null);
  const geocoderInstance = useRef<MapboxGeocoder | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const showError = (msg: string) => setErrorMsg(msg);

  useEffect(() => {

    if (mode !== "search") {
      try { geocoderInstance.current?.clear(); } catch {}
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
    geocoder.on("result", (e: any) => setSelectedCoord((e?.result?.center as [number, number]) ?? null));
    geocoder.on("clear", () => setSelectedCoord(null));
    geocoderInstance.current = geocoder;



    return () => { try { geocoder.clear(); } catch {}; geocoderInstance.current = null; if (geocoderRef.current) geocoderRef.current.innerHTML = ""; };
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
    try { geocoderInstance.current?.clear(); } catch {}
    setSelectedCoord(null);
  };
  const removeSearchPoint = (idx: number) => setSearchPoints((p) => p.filter((_, i) => i !== idx));
  const clearSearchPoints = () => { setSearchPoints([]); setSelectedCoord(null); try { geocoderInstance.current?.clear(); } catch {} };

  const changeMode = (m: Mode) => {
    setMode(m);
    if (m === "search") onResetPoints?.(); else clearSearchPoints();
  };

  const checkRouteNameExists = async (routeName: string) => {
    try {
      const res = await fetch(`${API}/routes/by-name/${encodeURIComponent(routeName.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      return true;
    } catch (err) {
      return false; 
    }
  };

  const handleSave = async () => {
    const points = mode === "draw" ? drawPoints : searchPoints;
    if (points.length < 3) { showError("Mínimo se han de seleccionar 3 puntos de interés"); return; }
    if (!name.trim()) { showError("Falta añadir nombre a la ruta"); return; }
    if (name.trim().length > 30) { showError("El nombre supera los 30 caracteres"); return; }

    const exists = await checkRouteNameExists(name);
    if (exists) { showError("Este nombre de ruta ya existe"); return; }

    if (!description.trim()) { showError("Falta añadir una descripción a la ruta"); return; }
    if (!category) { showError("No se ha seleccionado ninguna categoría"); return; }
    const formattedPoints = points.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    const payload = {
      name: name.trim(),
      description: description.trim(),
      points: formattedPoints,
      visibility: !isPrivate,
      category: category as Category,
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
      try { console.log("Ruta enviada:", await res.json()); } catch { console.log("Ruta enviada (sin JSON)"); }
      onClose?.();
    } catch (e) { console.error(e); showError("No se pudo guardar la ruta."); }
  };

  return {
    viewProps: {
      mode,
      name,
      description,
      isPrivate,
      category,
  
      geocoderRef,
      searchPoints,
      drawPoints,
      selectedCoord,
      onChangeName,
      onTogglePrivate: setIsPrivate,
      onChangeCategory: (v: Category | "") => setCategory(v),
      onChangeDescription: setDescription,
      onChangeMode: changeMode,
      onAddSearchPoint: addSearchPoint,
      onClearSearchPoints: clearSearchPoints,
      onRemoveSearchPoint: removeSearchPoint,
      onResetDrawPoints: onResetPoints,
      onSave: handleSave,
      nameTooLong,
  
      errorMsg,
      onDismissError: () => setErrorMsg(null),
    },
  
    errorMsg,
    setErrorMsg,
    showError,
  } as const;
  
}
