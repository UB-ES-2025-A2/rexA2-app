import React from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/context/UnitPreferenceContext", () => ({
  useUnitPreference: () => ({
    unit: "km",
    setUnit: vi.fn(),
    formatDistance: (distanceKm: number | null | undefined) =>
      distanceKm == null ? "0 km" : `${distanceKm} km`,
  }),
}));

import RouteSearchBar from "../../src/components/RouteSearchBar/RouteSearchBar";
import TextField from "../../src/components/TextField";
import { validatePassword } from "../../src/utils/validation";

const buildCategories = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    value: `cat-${i}`,
    label: `Categoria ${i}`,
  }));

afterEach(() => {
  cleanup();
});

describe("Tests de rendimiento web", () => {
  test("RouteSearchBar maneja un catálogo grande sin degradar", () => {
    const categories = buildCategories(2000);
    const handleQueryChange = () => {};

    const start = performance.now();
    const { unmount } = render(
      <RouteSearchBar
        mode="routes"
        query=""
        onQueryChange={handleQueryChange}
        categoryOptions={categories}
      />
    );
    const durationMs = performance.now() - start;

    expect(durationMs).toBeLessThan(500);
    unmount();
  });

  test("Render masivo de campos de texto sigue siendo rápido", () => {
    const fields = Array.from({ length: 400 }, (_, i) => (
      <TextField
        key={i}
        id={`field-${i}`}
        label={`Campo ${i}`}
        defaultValue={`Valor ${i}`}
      />
    ));

    const start = performance.now();
    const { container, unmount } = render(<div>{fields}</div>);
    const durationMs = performance.now() - start;

    expect(container.querySelectorAll("input").length).toBe(400);
    expect(durationMs).toBeLessThan(700);
    unmount();
  });

  test("Validaciones de contraseña procesan lotes grandes con rapidez", () => {
    const passwords = Array.from({ length: 5000 }, (_, i) => `Aa1!pass${i}`);

    const start = performance.now();
    const results = passwords.map((pw) => validatePassword(pw));
    const durationMs = performance.now() - start;

    expect(results.every((r) => r === undefined)).toBe(true);
    expect(durationMs).toBeLessThan(120);
  });
});
