import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DistanceAchievementsBlock from "../../src/components/Achievements/DistanceAchievementsBlock";

vi.mock("../../src/services/achievements", () => ({
  getDistanceAchievements: vi.fn(),
}));

const mockedService = vi.mocked(
  await import("../../src/services/achievements").then((m) => m.getDistanceAchievements)
);

describe("DistanceAchievementsBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra progreso total y niveles bloqueados/desbloqueados", async () => {
    mockedService.mockResolvedValueOnce([
      {
        code: "distance_10",
        name: "Caminante I",
        is_unlocked: true,
        threshold_value: 10,
        current_value: 12,
        rarity: "common",
      },
      {
        code: "distance_25",
        name: "Caminante II",
        is_unlocked: false,
        threshold_value: 25,
        current_value: 12,
        rarity: "common",
      },
    ]);

    render(<DistanceAchievementsBlock userId="user-1" />);

    await screen.findByText(/Distancia recorrida/i);
    expect(screen.getByText(/Total/i)).toBeInTheDocument();
    expect(screen.getAllByText(/12 \/ 25 km/i)[0]).toBeInTheDocument();
    expect(document.querySelectorAll(".distance-level.unlocked").length).toBe(1);
    expect(document.querySelectorAll(".distance-level.locked").length).toBe(1);
  });

  test("muestra error cuando falla la carga", async () => {
    mockedService.mockRejectedValueOnce(new Error("Fallo al cargar"));

    render(<DistanceAchievementsBlock userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Fallo al cargar/i)).toBeInTheDocument();
    });
  });
});
