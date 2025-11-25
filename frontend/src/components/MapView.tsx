import { useEffect, useRef, useState, useCallback } from "react";
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

async function getRoutedPath(points: Array<[number, number]>): Promise<Array<[number, number]>> {
  if (points.length < 2) return points;

  const coords = points.map((p) => `${p[0]},${p[1]}`).join(";");

  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?access_token=${mapboxgl.accessToken}&geometries=geojson&overview=full`
    );

    if (!response.ok) {
      console.warn("Directions API error:", response.status);
      return points;
    }

    const data = await response.json();
    if (data.routes && data.routes[0]) {
      const coords = data.routes[0].geometry.coordinates;
      return coords as Array<[number, number]>;
    }
  } catch (err) {
    console.warn("Error getting routed path:", err);
  }

  return points;
}

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
  const animationFrameRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forceMapResize = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.resize();
      requestAnimationFrame(() => {
        mapRef.current?.resize();
      });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom,
      preserveDrawingBuffer: true,
      trackResize: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      setTimeout(() => map.resize(), 50);
      setTimeout(() => map.resize(), 150);
      setTimeout(() => map.resize(), 300);
      setTimeout(() => map.resize(), 500);

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
        lineMetrics: true,
        data: {
          type: "FeatureCollection",
          features: [],
        } as FeatureCollection,
      });

      map.addLayer({
        id: "highlight-line-glow",
        type: "line",
        source: "highlight-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#4f46e5",
          "line-width": 12,
          "line-blur": 8,
          "line-opacity": 0.6,
        },
        filter: ["==", "$type", "LineString"],
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
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "#1e40af",
            0.5,
            "#4f46e5",
            1,
            "#c026d3",
          ],
          "line-width": 5,
        },
        filter: ["==", "$type", "LineString"],
      });

      map.addLayer({
        id: "highlight-line-pulse",
        type: "line",
        source: "highlight-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#e879f9",
          "line-width": 3,
          "line-opacity": 0,
        },
        filter: ["==", "$type", "LineString"],
      });

      map.addLayer({
        id: "highlight-points-glow",
        type: "circle",
        source: "highlight-route",
        paint: {
          "circle-radius": 12,
          "circle-color": "#4f46e5",
          "circle-opacity": 0.3,
          "circle-blur": 0.8,
        },
        filter: ["==", "$type", "Point"],
      });

      map.addLayer({
        id: "highlight-points",
        type: "circle",
        source: "highlight-route",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#4f46e5",
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
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        map.resize();
      }, 100);
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
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
      console.warn("El source 'highlight-route' no está disponible");
      return;
    }

    async function updateRoute() {
      const routedPoints = await getRoutedPath(highlightPoints);

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features:
          routedPoints.length > 0
            ? [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: routedPoints,
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

      if (routedPoints.length > 0 && map) {
        startAnimations(map);
      } else if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    updateRoute();
  }, [highlightPoints, mapLoaded]);

  const startAnimations = (map: Map) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    let phase = 0;

    const animate = () => {
      phase += 0.01;

      const pulseOpacity = Math.abs(Math.sin(phase * 2)) * 0.8;
      if (map.getLayer("highlight-line-pulse")) {
        map.setPaintProperty("highlight-line-pulse", "line-opacity", pulseOpacity);
      }

      const glowRadius = 12 + Math.sin(phase * 3) * 4;
      const glowOpacity = 0.2 + Math.abs(Math.sin(phase * 2)) * 0.3;
      if (map.getLayer("highlight-points-glow")) {
        map.setPaintProperty("highlight-points-glow", "circle-radius", glowRadius);
        map.setPaintProperty("highlight-points-glow", "circle-opacity", glowOpacity);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      forceMapResize();
    }, 350);

    return () => clearTimeout(timer);
  }, [allowPickPoint, className, forceMapResize]);

  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      setTimeout(() => {
        forceMapResize();
      }, 100);
    }
  }, [highlightPoints.length, mapLoaded, forceMapResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTransitionEnd = () => {
      forceMapResize();
    };

    container.addEventListener("transitionend", handleTransitionEnd);

    return () => {
      container.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [forceMapResize]);

  return (
    <div
      ref={containerRef}
      className={className ? `map-view ${className}` : "map-view"}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        transform: "none",
      }}
    />
  );
}
