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

      map.addLayer({
        id: "highlight-point-labels",
        type: "symbol",
        source: "highlight-route",
        layout: {
          "text-field": ["get", "order"],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-offset": [0, 1.1],
        },
        paint: {
          "text-color": "#1d4ed8",
          "text-halo-color": "#fff",
          "text-halo-width": 1.2,
        },
        filter: ["==", "$type", "Point"],
      });

      setMapLoaded(true);
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      markerRefs.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !onPickPoint) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (!allowPickPoint) return;
      onPickPoint(e.lngLat.lng, e.lngLat.lat);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [allowPickPoint, onPickPoint, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    map.resize();
  }, [allowPickPoint, mapLoaded]);

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
            ...highlightPoints.map<Feature<Point>>((coord, idx) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coord,
              },
              properties: { order: idx + 1 },
            })),
          ]
        : [],
    };
  
    (source as mapboxgl.GeoJSONSource).setData(geojson);
  
  }, [highlightPoints, mapLoaded]);
  


  return (
    <div className={`map-view ${className ?? ""}`}>
      <div ref={containerRef} className="map-view__canvas" />
    </div>
  );
}
