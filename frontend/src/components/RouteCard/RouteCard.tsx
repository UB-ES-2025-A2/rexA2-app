import React from "react";
import RouteCardView from "./RouteCardView";
import { useRouteCard } from "./useRouteCard";
import type { Mode } from "./types";

export type Props = {
  modeDefault?: Mode;
  drawPoints?: Array<[number, number]>;
  onResetPoints?: () => void;
  onClose?: () => void;
};

export default function RouteCard({ modeDefault = "search", drawPoints = [], onResetPoints, onClose }: Props) {
  const ctrl = useRouteCard({ modeDefault, drawPoints, onResetPoints, onClose });
  return <RouteCardView {...ctrl.viewProps} />;
}
