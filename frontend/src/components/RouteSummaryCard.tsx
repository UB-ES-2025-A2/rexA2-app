import React from "react";
import "../styles/RouteSummaryCard.css";

type RouteSummaryProps = {
    route: {
        id: string;
        name: string;
        distanceKm?: number | null;
        durationMinutes?: number | null;
        rating?: number | null;
        rating_count?: number | null;
    };
    onViewDetails: () => void;
    onClose: () => void;
};

export default function RouteSummaryCard({
    route,
    onViewDetails,
    onClose,
}: RouteSummaryProps) {
    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="route-summary-card">
            <div className="route-summary-header">
                <h3 className="route-summary-title">{route.name}</h3>
                <button
                    className="route-summary-close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    aria-label="Cerrar resumen"
                >
                    &times;
                </button>
            </div>

            <div className="route-summary-stats">
                {route.distanceKm != null && (
                    <div className="route-stat" title="Distancia">
                        <span className="route-stat-icon">📏</span>
                        <span>{route.distanceKm} km</span>
                    </div>
                )}

                {route.durationMinutes != null && (
                    <div className="route-stat" title="Duración estimada">
                        <span className="route-stat-icon">⏱️</span>
                        <span>{formatDuration(route.durationMinutes)}</span>
                    </div>
                )}

                {route.rating != null && (
                    <div className="route-stat" title="Valoración media">
                        <span className="route-stat-icon">⭐</span>
                        <span>{route.rating.toFixed(1)}</span>
                        {route.rating_count ? (
                            <span style={{ fontSize: "0.8em", opacity: 0.7 }}>
                                ({route.rating_count})
                            </span>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="route-summary-actions">
                <button className="route-summary-btn" onClick={onViewDetails}>
                    Ver detalle
                </button>
            </div>
        </div>
    );
}
