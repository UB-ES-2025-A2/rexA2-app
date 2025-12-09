import RouteCardView from "./RouteCardView";
import { useRouteCard } from "./useRouteCard";
import type { Mode } from "../types";

export type Props = {
  modeDefault?: Mode;
  drawPoints?: Array<[number, number]>;
  onResetPoints?: () => void;
  onClose?: () => void;
  initialImages?: string[];

  ctrl?: ReturnType<typeof useRouteCard>;
};

export default function RouteCard({
  modeDefault = "search",
  drawPoints = [],
  onResetPoints,
  onClose,
  initialImages,
  ctrl,
}: Props) {
  const internal = useRouteCard({ modeDefault, drawPoints, onResetPoints, onClose, initialImages });
  const c = ctrl ?? internal;
  return <RouteCardView {...c.viewProps} />;
}
