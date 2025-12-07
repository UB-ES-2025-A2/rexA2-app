import "../styles/RouteSummaryCard.css";

type RouteSummaryProps = {
    route: {
        id: string;
        name: string;
        distanceKm?: number | null;
        durationMinutes?: number | null;
        rating?: number | null;
        rating_count?: number | null;
        image?: string;
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
            <div className="route-summary-image-container">
                {route.image ? (
                    <img
                        src={route.image}
                        alt={route.name}
                        className="route-summary-image"
                    />
                ) : (
                    <div
                        className="route-summary-image"
                        style={{
                            background: "linear-gradient(135deg, #e0e7ff 0%, #fae8ff 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6366f1",
                            fontSize: "2rem",
                        }}
                    >
                        🗺️
                    </div>
                )}
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

            <div className="route-summary-content">
                <h3 className="route-summary-title">{route.name}</h3>

                <div className="route-summary-stats">
                    {route.rating != null && (
                        <div className="route-stat" title="Valoración media">
                            <span className="route-stat-icon">⭐</span>
                            <span>{route.rating.toFixed(1)}</span>
                        </div>
                    )}
                    {route.distanceKm != null && (
                        <div className="route-stat" title="Distancia">
                            <span>•</span>
                            <span>{route.distanceKm} km</span>
                        </div>
                    )}
                    {route.durationMinutes != null && (
                        <div className="route-stat" title="Duración estimada">
                            <span>•</span>
                            <span>{formatDuration(route.durationMinutes)}</span>
                        </div>
                    )}
                </div>

                <button className="route-summary-btn" onClick={onViewDetails}>
                    Ver detalle
                </button>
            </div>
        </div>
    );
}
