import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import RouteSearchBar from "../../src/components/RouteSearchBar/RouteSearchBar";

const sampleRoutes: any[] =[
  {
    id: "1",
    name: "Ruta de montaña",
    description: "Una ruta por la montaña",
    category: "montaña",
    points: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    visibility: true,
  },
  {
    id: "2",
    name: "Ruta de playa",
    description: "Ruta junto al mar",
    category: "playa",
    points: [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ],
    visibility: true,
  },
];

describe("RouteSearchBar", () => {
  test("usa el placeholder correcto cuando se buscan rutas", () => {
    const handleQueryChange = vi.fn();

    render(
      <RouteSearchBar
        routes={sampleRoutes}
        mode="routes"
        query=""
        onQueryChange={handleQueryChange}
      />
    );

    expect(
      screen.getByPlaceholderText(
        "Buscar rutas por nombre, creador o descripción..."
      )
    ).toBeInTheDocument();
  });

  test("usa el placeholder correcto cuando se buscan usuarios", () => {
    const handleQueryChange = vi.fn();

    render(
      <RouteSearchBar
        routes={sampleRoutes}
        mode="users"
        query=""
        onQueryChange={handleQueryChange}
      />
    );

    expect(
      screen.getByPlaceholderText(
        "Buscar usuarios por nombre, username o email..."
      )
    ).toBeInTheDocument();
  });

  test("llama a onQueryChange cuando el usuario escribe en la barra de búsqueda", async () => {
    const user = userEvent.setup();
    const handleQueryChange = vi.fn();

    render(
      <RouteSearchBar
        routes={sampleRoutes}
        mode="routes"
        query=""
        onQueryChange={handleQueryChange}
      />
    );

    const input = screen.getByPlaceholderText(
      "Buscar rutas por nombre, creador o descripción..."
    );

    await user.type(input, "montaña");

    expect(handleQueryChange).toHaveBeenCalled();

    const calls = handleQueryChange.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(["m", "o", "n", "t", "a", "ñ", "a"]);
  });


  test("abre el modal de filtros y aplica filtros llamando a onApplyFilters", async () => {
    const user = userEvent.setup();
    const handleQueryChange = vi.fn();
    const handleApplyFilters = vi.fn();

    render(
      <RouteSearchBar
        routes={sampleRoutes}
        mode="routes"
        query=""
        onQueryChange={handleQueryChange}
        onApplyFilters={handleApplyFilters}
      />
    );

    const filterButton = screen.getByTitle("Filtros");
    await user.click(filterButton);

    expect(screen.getByText("Explorar por filtros")).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    const categorySelect = selects[0];
    const pointsSelect = selects[1];

    await user.selectOptions(categorySelect, "playa");

    await user.selectOptions(pointsSelect, "few");

    const exploreButton = screen.getByRole("button", { name: "Explorar" });
    await user.click(exploreButton);

    expect(handleApplyFilters).toHaveBeenCalledWith({
      category: "playa",
      pointsFilter: "few",
    });
  });
});
