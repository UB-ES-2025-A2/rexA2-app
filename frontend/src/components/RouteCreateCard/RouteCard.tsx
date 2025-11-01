import React from "react";
import RouteCardView from "./RouteCardView";
import { useRouteCard } from "./useRouteCard";
import type { Mode } from "../types";

export type Props = {
  modeDefault?: Mode;
  drawPoints?: Array<[number, number]>;
  onResetPoints?: () => void;
  onClose?: () => void;

  ctrl?: ReturnType<typeof useRouteCard>;
};

export default function RouteCard({
  modeDefault = "search",
  drawPoints = [],
  onResetPoints,
  onClose,
  ctrl,
}: Props) {
  const internal = useRouteCard({ modeDefault, drawPoints, onResetPoints, onClose });
  const c = ctrl ?? internal;
  return <RouteCardView {...c.viewProps} />;
}