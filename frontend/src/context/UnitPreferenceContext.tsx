import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
} from "react";
import type { ReactNode } from "react";
import type { UnitPreference } from "../utils/formatDistance";
import { formatDistance as formatDistanceUtil } from "../utils/formatDistance";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "rex_unit_preference";
const API = import.meta.env.VITE_API_URL || window.location.origin;

type UnitPreferenceContextValue = {
    unit: UnitPreference;
    setUnit: (unit: UnitPreference) => void;
    formatDistance: (distanceKm: number | null | undefined) => string;
};

const UnitPreferenceContext = createContext<UnitPreferenceContextValue | null>(
    null
);

export function UnitPreferenceProvider({ children }: { children: ReactNode }) {
    const { token, user } = useAuth();

    // Initialize from localStorage
    const [unit, setUnitState] = useState<UnitPreference>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "mi" || stored === "km") return stored;
        return "km";
    });

    // Sync with user profile when authenticated
    useEffect(() => {
        if (!token) return;

        let cancelled = false;

        const fetchUserPreference = async () => {
            try {
                const res = await fetch(`${API}/users/me/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const preferredUnits = data?.preferred_units;
                if (!cancelled && (preferredUnits === "km" || preferredUnits === "mi")) {
                    setUnitState(preferredUnits);
                    localStorage.setItem(STORAGE_KEY, preferredUnits);
                }
            } catch (err) {
                console.warn("[UnitPreference] Could not fetch user preference:", err);
            }
        };

        fetchUserPreference();
        return () => {
            cancelled = true;
        };
    }, [token, user]);

    const setUnit = useCallback((newUnit: UnitPreference) => {
        setUnitState(newUnit);
        localStorage.setItem(STORAGE_KEY, newUnit);
    }, []);

    const formatDistance = useCallback(
        (distanceKm: number | null | undefined) => formatDistanceUtil(distanceKm, unit),
        [unit]
    );

    const value = useMemo<UnitPreferenceContextValue>(
        () => ({ unit, setUnit, formatDistance }),
        [unit, setUnit, formatDistance]
    );

    return (
        <UnitPreferenceContext.Provider value={value}>
            {children}
        </UnitPreferenceContext.Provider>
    );
}

export function useUnitPreference() {
    const ctx = useContext(UnitPreferenceContext);
    if (!ctx) {
        throw new Error(
            "useUnitPreference must be used within <UnitPreferenceProvider>"
        );
    }
    return ctx;
}
