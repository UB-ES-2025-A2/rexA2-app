import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CreatedRoutesAchievements from "../../src/components/Achievements/CreatedRoutesAchievements";

vi.mock("../../src/services/achievements", () => ({
  getCreatedRoutesAchievements: vi.fn(),
}));

const mockedService = vi.mocked(
  await import("../../src/services/achievements").then((m) => m.getCreatedRoutesAchievements)
);

describe("CreatedRoutesAchievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renderiza logros con contador desbloqueados/bloqueados", async () => {
    mockedService.mockResolvedValueOnce([
      {
        code: "created_routes_1",
        name: "Autor Novel",
        is_unlocked: true,
        threshold_value: 1,
        current_value: 2,
        rarity: "common",
      },
      {
        code: "created_routes_3",
        name: "Autor Activo",
        is_unlocked: false,
        threshold_value: 3,
        current_value: 2,
        rarity: "common",
      },
    ]);

    render(<CreatedRoutesAchievements userId="user-1" />);

    await screen.findByText("Rutas creadas");
    await screen.findByText(/1 \/ 2 desbloqueados/i);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(document.querySelectorAll(".achievement-card.unlocked").length).toBe(1);
    expect(document.querySelectorAll(".achievement-card.locked").length).toBe(1);
  });

  test("muestra error cuando falla la carga", async () => {
    mockedService.mockRejectedValueOnce(new Error("Fallo al cargar"));

    render(<CreatedRoutesAchievements userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Fallo al cargar/i)).toBeInTheDocument();
    });
  });
});
