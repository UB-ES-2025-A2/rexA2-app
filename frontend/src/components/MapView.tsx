import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map, Marker } from "mapbox-gl";
import type { Feature, FeatureCollection, Point, LineString } from "geojson";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

type MarkerData = { id: string; title?: string; lng: number; lat: number };

type Props = {
  className?: string;
  center?: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  allowPickPoint?: boolean;
  onPickPoint?: (lng: number, lat: number) => void;
  highlightPoints?: Array<[number, number]>;
};

export default function MapView({
  className,
  center = [2.1734, 41.3851],
  zoom = 11,
  markers = [],
  allowPickPoint = false,
  onPickPoint,
  highlightPoints = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

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

      map.addSource("highlight-route", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        } as FeatureCollection,
      });

      map.addLayer({
        id: "highlight-line",
        type: "line",
        source: "highlight-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
        },
      });

      map.addLayer({
        id: "highlight-points",
        type: "circle",
        source: "highlight-route",
        paint: {
          "circle-radius": 5,
          "circle-color": "#1d4ed8",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff",
        },
        filter: ["==", "$type", "Point"],
      });

      setMapLoaded(true);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
  
    const source = map.getSource("highlight-route");
  
    if (!source || !("setData" in source)) {
      console.warn("El source 'highlight-route' no está disponible o no es GeoJSONSource");
      return;
    }
  
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: highlightPoints.length > 0
        ? [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: highlightPoints,
              },
              properties: {},
            } as Feature<LineString>,
            ...highlightPoints.map<Feature<Point>>((coord) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coord,
              },
              properties: {},
            }))
          ]
        : [],
    };
  
    (source as mapboxgl.GeoJSONSource).setData(geojson);
  
    if (highlightPoints.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      highlightPoints.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      map.fitBounds(bounds, { padding: 60 });
    }
  }, [highlightPoints, mapLoaded]);
  

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
