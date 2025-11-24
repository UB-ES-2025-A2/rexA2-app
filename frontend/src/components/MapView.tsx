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

async function getRoutedPath(points: Array<[number, number]>): Promise<Array<[number, number]>> {
  if (points.length < 2) return points;

  const coords = points.map(p => `${p[0]},${p[1]}`).join(";");
  
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
        lineMetrics: true,
        data: {
          type: "FeatureCollection",
          features: [],
        } as FeatureCollection,
      });
      /*
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
      });*/
      // Capa base de la línea (sombra/glow)
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

      // Línea principal con gradiente
      map.addLayer({
        id: "highlight-line",
        type: "line",
        source: "highlight-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0, "#1e40af",    // Azul oscuro intenso
            0.5, "#4f46e5",  
            1, "#c026d3"     // Magenta oscuro 
          ],
          "line-width": 5,
        },
        filter: ["==", "$type", "LineString"],
      });

      // Capa animada que viaja por la línea
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

      // Puntos - glow exterior
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

      // Puntos principales
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      ro.disconnect();
      markerRefs.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [allowPickPoint, onPickPoint]);

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
        features: routedPoints.length > 0
          ? [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: routedPoints,
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
              })),
            ]
          : [],
      };
    
      (source as mapboxgl.GeoJSONSource).setData(geojson);
    
      if (routedPoints.length > 0 && map) {
        const bounds = new mapboxgl.LngLatBounds();
        routedPoints.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        map.fitBounds(bounds, { padding: 60 });
        startAnimations(map);
      } else {
        // Detener animaciones si no hay ruta ← AÑADE ESTO
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
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

      // Animación de pulso en la línea blanca
      const pulseOpacity = Math.abs(Math.sin(phase * 2)) * 0.8;
      if (map.getLayer("highlight-line-pulse")) {
        map.setPaintProperty("highlight-line-pulse", "line-opacity", pulseOpacity);
      }

      // Animación de pulso en los puntos
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

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
