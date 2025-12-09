/**
 * Format distance utility with unit conversion support
 */

export type UnitPreference = "km" | "mi";

const KM_TO_MILES = 0.621371;

/**
 * Formats a distance value according to the user's unit preference.
 * @param distanceKm - The distance in kilometers (always stored in km)
 * @param unit - The unit preference ("km" or "mi")
 * @returns Formatted string like "12.5 km" or "7.8 mi"
 */
export function formatDistance(
    distanceKm: number | null | undefined,
    unit: UnitPreference = "km"
): string {
    if (distanceKm == null) return "Distancia N/D";

    if (unit === "mi") {
        const miles = distanceKm * KM_TO_MILES;
        return `${miles.toFixed(1)} mi`;
    }

    return `${distanceKm.toFixed(1)} km`;
}

/**
 * Converts km to miles
 */
export function kmToMiles(km: number): number {
    return km * KM_TO_MILES;
}

/**
 * Returns the unit label
 */
export function getUnitLabel(unit: UnitPreference): string {
    return unit === "mi" ? "millas" : "kilómetros";
}

/**
 * Returns the short unit label
 */
export function getUnitShortLabel(unit: UnitPreference): string {
    return unit === "mi" ? "mi" : "km";
}
