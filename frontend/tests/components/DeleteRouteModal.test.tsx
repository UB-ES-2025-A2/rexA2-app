import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import DeleteRouteModal from "../../src/components/RouteViewCard/DeleteRouteModal";

describe("DeleteRouteModal", () => {
  test("muestra el nombre de la ruta y los botones cuando está abierto en estado idle", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <DeleteRouteModal
        open={true}
        routeName="Ruta de prueba"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const titles = screen.getAllByText("Eliminar ruta");
    expect(titles.length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByText(/¿Estás seguro de que deseas eliminar la ruta/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/"Ruta de prueba"/)).toBeInTheDocument();

    expect(
      screen.getByText("Esta acción no se puede deshacer.")
    ).toBeInTheDocument();

    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(titles.some((el) => el.tagName === "BUTTON")).toBe(true);
  });

  test("llama a onCancel cuando se pulsa el botón Cancelar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <DeleteRouteModal
        open={true}
        routeName="Ruta de prueba"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByText("Cancelar");

    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
