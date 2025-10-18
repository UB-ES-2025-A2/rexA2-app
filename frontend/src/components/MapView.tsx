import { useEffect, useRef } from "react";
import mapboxgl, { Map, Marker } from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

type MarkerData = { id: string; title?: string; lng: number; lat: number };

type Props = {
  className?: string;
  center?: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  allowPickPoint?: boolean;
  onPickPoint?: (lng: number, lat: number) => void;
};

export default function MapView({
  className,
  center = [2.1734, 41.3851],
  zoom = 11,
  markers = [],
  allowPickPoint = false,
  onPickPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRefs = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
    });

    mapRef.current = map;

    map.on("load", () => {
      setTimeout(() => map.resize(), 200);

      const trafficLayers = [
        "traffic-lines-incidents-day",
        "traffic-lines-incidents-night",
        "traffic-incidents",
        "traffic-line-casing",
        "traffic-line-fill",
      ];
      trafficLayers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      });
    });
    if (allowPickPoint && onPickPoint) {
      map.on("click", (e) => {
        onPickPoint(e.lngLat.lng, e.lngLat.lat);
      });
    }

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      markerRefs.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [allowPickPoint, onPickPoint]);

  useEffect(() => {
    if (!mapRef.current) return;

    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    markers.forEach((m) => {
      const marker = new mapboxgl.Marker().setLngLat([m.lng, m.lat]).addTo(mapRef.current!);
      if (m.title) {
        const popup = new mapboxgl.Popup({ offset: 24 }).setText(m.title);
        marker.setPopup(popup);
      }
      markerRefs.current.push(marker);
    });
  }, [markers]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
