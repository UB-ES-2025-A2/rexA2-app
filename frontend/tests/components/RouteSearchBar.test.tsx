import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("../../src/context/UnitPreferenceContext", () => ({
  useUnitPreference: () => ({
    unit: "km",
    setUnit: vi.fn(),
    formatDistance: (distanceKm: number | null | undefined) =>
      distanceKm == null ? "0 km" : `${distanceKm} km`,
  }),
}));

import RouteSearchBar from "../../src/components/RouteSearchBar/RouteSearchBar";

function RouteSearchBarHarness({
  mode = "routes",
  onQueryChange,
}: {
  mode?: "routes" | "users";
  onQueryChange: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <RouteSearchBar
      mode={mode}
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        onQueryChange(value);
      }}
    />
  );
}

describe("RouteSearchBar", () => {
  test("usa el placeholder correcto cuando se buscan rutas", () => {
    const handleQueryChange = vi.fn();

    render(<RouteSearchBar mode="routes" query="" onQueryChange={handleQueryChange} />);

    expect(
      screen.getByPlaceholderText(
        "Buscar rutas por nombre, creador o descripción..."
      )
    ).toBeInTheDocument();
  });

  test("usa el placeholder correcto cuando se buscan usuarios", () => {
    const handleQueryChange = vi.fn();

    render(<RouteSearchBar mode="users" query="" onQueryChange={handleQueryChange} />);

    expect(
      screen.getByPlaceholderText(
        "Buscar usuarios por nombre, username o email..."
      )
    ).toBeInTheDocument();
  });

  test("llama a onQueryChange cuando el usuario escribe en la barra de búsqueda", async () => {
    const user = userEvent.setup();
    const handleQueryChange = vi.fn();

    render(<RouteSearchBarHarness onQueryChange={handleQueryChange} />);

    const input = screen.getByPlaceholderText(
      "Buscar rutas por nombre, creador o descripción..."
    );

    await user.type(input, "montaña");

    expect(handleQueryChange).toHaveBeenCalled();
    const lastCall = handleQueryChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toBe("montaña");
  });

  test("abre el modal de filtros y aplica filtros llamando a onApplyFilters", async () => {
    const user = userEvent.setup();
    const handleQueryChange = vi.fn();
    const handleApplyFilters = vi.fn();

    render(
      <RouteSearchBar
        mode="routes"
        query=""
        onQueryChange={handleQueryChange}
        onApplyFilters={handleApplyFilters}
      />
    );

    const filterButton = screen.getByTitle("Filtros");
    await user.click(filterButton);

    expect(screen.getByText("Explorar por filtros")).toBeInTheDocument();

    const difficultyButton = screen.getByRole("button", { name: "Alta" });
    await user.click(difficultyButton);

    const exploreButton = screen.getByRole("button", { name: "Explorar" });
    await user.click(exploreButton);

    const lastCall = handleApplyFilters.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      category: "all",
      pointsFilter: "all",
      distance: "all",
      duration: "all",
      difficulty: "hard",
      theme: "all",
    });
  });
});
