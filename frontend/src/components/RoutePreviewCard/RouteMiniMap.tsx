import { useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";

type Props = {
  points: Array<[number, number]>;
  className?: string;
};

// Simple Polyline Encoder (Google Encoded Polyline Algorithm Format)
function encodePolyline(points: Array<[number, number]>): string {
  let str = "";
  let lastLat = 0;
  let lastLng = 0;

  for (const [lng, lat] of points) {
    let lat5 = Math.round(lat * 1e5);
    let lng5 = Math.round(lng * 1e5);

    let dLat = lat5 - lastLat;
    let dLng = lng5 - lastLng;

    lastLat = lat5;
    lastLng = lng5;

    str += encode(dLat) + encode(dLng);
  }

  return str;
}

function encode(num: number): string {
  let sgnNum = num << 1;
  if (num < 0) {
    sgnNum = ~(sgnNum);
  }
  let str = "";
  while (sgnNum >= 0x20) {
    str += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>= 5;
  }
  str += String.fromCharCode(sgnNum + 63);
  return str;
}

/**
 * Mini mapa estático para previsualizar la ruta.
 * Usa Mapbox Static Images API para evitar crear contextos WebGL pesados.
 */
export default function RouteMiniMap({ points, className }: Props) {
  const { resolvedTheme } = useTheme();

  const staticMapUrl = useMemo(() => {
    if (!points || points.length === 0) return null;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return null;

    // Simplificar puntos si hay demasiados para evitar límites de URL (aprox 100 puntos max para seguridad)
    let processingPoints = points;
    if (points.length > 80) {
      const step = Math.ceil(points.length / 80);
      processingPoints = points.filter((_, i) => i % step === 0);
      // Asegurar que el último punto esté incluido
      if (processingPoints[processingPoints.length - 1] !== points[points.length - 1]) {
        processingPoints.push(points[points.length - 1]);
      }
    }

    const encodedPath = encodeURIComponent(encodePolyline(processingPoints));
    // path-{strokeWidth}+{strokeColor}-{strokeOpacity}({polyline})
    const pathParam = `path-4+6366f1-0.9(${encodedPath})`;

    // Seleccionar estilo según el tema
    const styleId = resolvedTheme === "dark" ? "mapbox/navigation-night-v1" : "mapbox/streets-v12";

    // Usamos 'auto' para que Mapbox calcule el encuadre basado en el path
    return `https://api.mapbox.com/styles/v1/${styleId}/static/${pathParam}/auto/600x400@2x?access_token=${token}&padding=25&logo=false&attribution=false`;
  }, [points, resolvedTheme]);

  if (!staticMapUrl) {
    return <div className={className} style={{ backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6" }} />;
  }

  return (
    <div className={className} style={{ overflow: "hidden", position: "relative", backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#e5e7eb" }}>
      <img
        src={staticMapUrl}
        alt="Vista previa de la ruta"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        loading="lazy"
      />
    </div>
  );
}
