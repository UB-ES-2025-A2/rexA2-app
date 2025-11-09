import type React from "react";
import type { Category } from "../types";
import "../../styles/RoutePreviewCard.css";

type Props = {
  id: number | string;
  name: string;
  category: Category;
  points: Array<[number, number]>;
  onClick?: () => void;
};

const RoutePreviewCard: React.FC<Props> = ({ name, category, points, onClick }) => {
  return (
    <div className="route-preview-card" onClick={onClick}>
      <h3 className="route-preview-title">{name}</h3>
      <p className="route-preview-category">Categoría: {category}</p>
      <p className="route-preview-points">{points.length} punto{points.length === 1 ? "" : "s"}</p>
    </div>
  );
};

export default RoutePreviewCard;