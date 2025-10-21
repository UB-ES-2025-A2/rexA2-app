import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import type { Category, Mode } from "../types";

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
  const [mode, setMode] = useState<Mode>(modeDefault);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [searchPoints, setSearchPoints] = useState<Array<[number, number]>>([]);
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null);
  const geocoderRef = useRef<HTMLDivElement | null>(null);
  const geocoderInstance = useRef<MapboxGeocoder | null>(null);

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

  const handleSave = async () => {
    const points = mode === "draw" ? drawPoints : searchPoints;
    if (!points.length) return alert("Añade al menos un punto.");
    if (!name.trim()) return alert("Pon un nombre a la ruta.");
    if (!category) return alert("Selecciona una categoría.");

    const payload = { name: name.trim(), points, private: isPrivate, category: category as Category };
    try {
      const res = await fetch("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      try { console.log("Ruta enviada:", await res.json()); } catch { console.log("Ruta enviada (sin JSON)"); }
      onClose?.();
    } catch (e) { console.error(e); alert("No se pudo guardar la ruta."); }
  };

  return {
    viewProps: {
      mode,
      name,
      isPrivate,
      category,

      geocoderRef,
      searchPoints,
      drawPoints,
      selectedCoord,

      onChangeName: setName,
      onTogglePrivate: setIsPrivate,
      onChangeCategory: (v: Category | "") => setCategory(v),
      onChangeMode: changeMode,
      onAddSearchPoint: addSearchPoint,
      onClearSearchPoints: clearSearchPoints,
      onRemoveSearchPoint: removeSearchPoint,
      onResetDrawPoints: onResetPoints,
      onSave: handleSave,
    },
  } as const;
}
