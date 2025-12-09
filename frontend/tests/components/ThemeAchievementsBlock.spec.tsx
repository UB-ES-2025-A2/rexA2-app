import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ThemeAchievementsBlock from "../../src/components/Achievements/ThemeAchievementsBlock";

vi.mock("../../src/services/achievements", () => ({
  getThemeAchievements: vi.fn(),
}));

const mockedService = vi.mocked(
  await import("../../src/services/achievements").then((m) => m.getThemeAchievements)
);

describe("ThemeAchievementsBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("agrupa logros por temática y muestra contadores", async () => {
    mockedService.mockResolvedValueOnce([
      {
        code: "theme_naturaleza_level_1",
        name: "Explorador de Naturaleza",
        is_unlocked: true,
        threshold_value: 1,
        current_value: 2,
        theme_id: "naturaleza",
      },
      {
        code: "theme_naturaleza_level_2",
        name: "Apasionado de Naturaleza",
        is_unlocked: false,
        threshold_value: 5,
        current_value: 2,
        theme_id: "naturaleza",
      },
      {
        code: "theme_aventura_level_1",
        name: "Explorador de Aventura",
        is_unlocked: false,
        threshold_value: 1,
        current_value: 0,
        theme_id: "aventura",
      },
    ]);

    render(<ThemeAchievementsBlock userId="user-1" />);

    await screen.findByText(/Por temática/i);
    expect(screen.getAllByText(/Naturaleza/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Aventura/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1\/2 desbloqueados/i)).toBeInTheDocument();
  });

  test("muestra error cuando falla la carga", async () => {
    mockedService.mockRejectedValueOnce(new Error("Fallo al cargar"));

    render(<ThemeAchievementsBlock userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Fallo al cargar/i)).toBeInTheDocument();
    });
  });
});
