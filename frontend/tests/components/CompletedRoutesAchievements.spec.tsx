import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CompletedRoutesAchievements from "../../src/components/Achievements/CompletedRoutesAchievements";

vi.mock("../../src/services/achievements", () => ({
  getCompletedRoutesAchievements: vi.fn(),
}));

const mockedService = vi.mocked(
  await import("../../src/services/achievements").then((m) => m.getCompletedRoutesAchievements)
);

describe("CompletedRoutesAchievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra contador y logros desbloqueados/bloqueados", async () => {
    mockedService.mockResolvedValueOnce([
      {
        code: "completed_routes_1",
        name: "Explorador inicial",
        is_unlocked: true,
        threshold_value: 1,
        current_value: 1,
        rarity: "common",
      },
      {
        code: "completed_routes_5",
        name: "Caminante constante",
        is_unlocked: false,
        threshold_value: 5,
        current_value: 2,
        rarity: "common",
      },
    ]);

    render(<CompletedRoutesAchievements userId="user-1" />);

    await screen.findByText("Rutas completadas");
    await screen.findByText(/1 \/ 2 desbloqueados/i);
    expect(screen.getAllByRole("article").length).toBe(2);
    expect(document.querySelectorAll(".achievement-card.unlocked").length).toBe(1);
    expect(document.querySelectorAll(".achievement-card.locked").length).toBe(1);
  });

  test("muestra mensaje de error si la carga falla", async () => {
    mockedService.mockRejectedValueOnce(new Error("Fallo al cargar"));

    render(<CompletedRoutesAchievements userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Fallo al cargar/i)).toBeInTheDocument();
    });
  });
});
