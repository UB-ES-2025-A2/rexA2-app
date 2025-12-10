import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "../../context/ThemeContext";

type Props = {
  points: Array<[number, number]>;
  className?: string;
};

/**
 * Mini mapa de solo lectura para previsualizar la ruta en las cards.
 * Usa Mapbox GL con interacción deshabilitada para evitar capturar eventos del card.
 */
export default function RouteMiniMap({ points, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!containerRef.current || !token || points.length === 0) return;

    mapboxgl.accessToken = token;

    const styleUrl =
      resolvedTheme === "dark"
        ? "mapbox://styles/mapbox/navigation-night-v1"
        : "mapbox://styles/mapbox/streets-v11";

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });
    mapRef.current = map;

    map.on("load", () => {
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points.map(([lng, lat]) => [lng, lat]),
        },
        properties: {},
      };

      map.addSource("mini-route", {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: "mini-route-line",
        type: "line",
        source: "mini-route",
        paint: {
          "line-color": "#6366f1",
          "line-width": 4,
        },
      });

      map.addLayer({
        id: "mini-route-points",
        type: "circle",
        source: "mini-route",
        paint: {
          "circle-radius": 4,
          "circle-color": "#22c55e",
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 1,
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 16, duration: 0, maxZoom: 14 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, resolvedTheme]);

  return <div ref={containerRef} className={className} />;
}
