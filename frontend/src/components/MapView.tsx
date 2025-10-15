// src/components/MapView.tsx
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
  center = [2.1734, 41.3851], // Barcelona
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
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
    });

    if (allowPickPoint && onPickPoint) {
      mapRef.current.on("click", (e) => {
        onPickPoint(e.lngLat.lng, e.lngLat.lat);
      });
    }

    return () => {

      markerRefs.current.forEach((m) => m.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

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
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
  
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
    });
  
    mapRef.current.on("load", () => {
      mapRef.current!.resize();
    });
  
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(containerRef.current);
  
    return () => {
      ro.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);
  

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
