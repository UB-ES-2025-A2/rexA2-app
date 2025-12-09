import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, beforeEach, vi, test } from "vitest";

const mockUseAuth = vi.fn();
const mockUseAlert = vi.fn();
const fetchWithAuthMock = vi.fn();

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../src/context/AlertContext", () => ({
  useAlert: () => mockUseAlert(),
}));

vi.mock("../../src/context/UnitPreferenceContext", () => ({
  useUnitPreference: () => ({
    unit: "km",
    setUnit: vi.fn(),
    formatDistance: (distanceKm: number | null | undefined) =>
      distanceKm == null ? "0 km" : `${distanceKm} km`,
  }),
}));

vi.mock("../../src/services/api", () => ({
  fetchWithAuth: (...args: any[]) => fetchWithAuthMock(...args),
}));

vi.mock("../../src/components/FavoriteButton", () => ({
  __esModule: true,
  default: () => <div data-testid="favorite-button" />,
}));

import RouteDetailsCard from "../../src/components/RouteViewCard/RouteDetailsCard";

describe("RouteDetailsCard - valoración de rutas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAlert.mockReturnValue({
      showAlert: vi.fn(),
      hideAlert: vi.fn(),
    });
  });

  test("muestra control de valoración y guarda cuando el usuario no es autor", async () => {
    const showAlert = vi.fn();
    mockUseAlert.mockReturnValue({ showAlert, hideAlert: vi.fn() });
    mockUseAuth.mockReturnValue({
      user: { id: "user123" },
      token: "token-123",
      login: vi.fn(),
      logout: vi.fn(),
    });

    fetchWithAuthMock.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path.includes("/ownership")) {
        return { ok: true, json: async () => ({ is_owner: false }) } as Response;
      }
      if (options?.method === "POST") {
        return { ok: true, json: async () => ({ user_rating: 5, average: 4.2, count: 6 }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          _id: "route-1",
          name: "Ruta pública",
          owner_id: "someone-else",
          visibility: true,
          points: [
            { latitude: 1, longitude: 1 },
            { latitude: 2, longitude: 2 },
            { latitude: 3, longitude: 3 },
          ],
          description: "d",
          category: "c",
          created_at: "2025-01-01T00:00:00Z",
        }),
      } as Response;
    });

    const user = userEvent.setup();

    render(
      <RouteDetailsCard
        routeId="route-1"
        name="Ruta pública"
        description="Desc"
        category="c"
        points={[
          [1, 1],
          [2, 2],
          [3, 3],
        ]}
        isPrivate={false}
        onClose={() => {}}
      />
    );

    await waitFor(() => expect(fetchWithAuthMock).toHaveBeenCalled());
    expect(await screen.findByText("Tu valoración")).toBeInTheDocument();

    const stars = screen.getAllByRole("radio");
    await user.click(stars[4]); // 5 estrellas

    await waitFor(() =>
      expect(fetchWithAuthMock).toHaveBeenCalledWith(
        "/routes/route-1/rating",
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(showAlert).toHaveBeenCalledWith("Valoración guardada", "success");
  });

  test("no muestra control de valoración cuando la ruta es del usuario", async () => {
    mockUseAlert.mockReturnValue({ showAlert: vi.fn(), hideAlert: vi.fn() });
    mockUseAuth.mockReturnValue({
      user: { id: "owner-1" },
      token: "token-123",
      login: vi.fn(),
      logout: vi.fn(),
    });

    fetchWithAuthMock.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path.includes("/ownership")) {
        return { ok: true, json: async () => ({ is_owner: true }) } as Response;
      }
      if (options?.method === "POST") {
        return { ok: false, json: async () => ({ detail: "No debes llegar aquí" }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          _id: "route-2",
          name: "Mi ruta",
          owner_id: "owner-1",
          visibility: true,
          points: [
            { latitude: 1, longitude: 1 },
            { latitude: 2, longitude: 2 },
            { latitude: 3, longitude: 3 },
          ],
          description: "d",
          category: "c",
          created_at: "2025-01-01T00:00:00Z",
          is_owner: true,
        }),
      } as Response;
    });

    render(
      <RouteDetailsCard
        routeId="route-2"
        name="Mi ruta"
        description="Desc"
        category="c"
        points={[
          [1, 1],
          [2, 2],
          [3, 3],
        ]}
        isPrivate={false}
        onClose={() => {}}
        isOwnRoute
      />
    );

    await waitFor(() => expect(fetchWithAuthMock).toHaveBeenCalled());
    expect(screen.queryByText("Tu valoración")).not.toBeInTheDocument();
  });
});
