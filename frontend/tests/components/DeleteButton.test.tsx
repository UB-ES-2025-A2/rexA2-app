import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import DeleteButton from "../../src/components/RouteViewCard/DeleteButton";

describe("DeleteButton", () => {
  test("llama a onClick cuando se hace click y no está deshabilitado", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<DeleteButton onClick={handleClick} />);

    const button = screen.getByRole("button", { name: "Eliminar ruta" });

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("no llama a onClick cuando está deshabilitado", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<DeleteButton onClick={handleClick} disabled />);

    const button = screen.getByRole("button", { name: "Eliminar ruta" });
    expect(button).toBeDisabled();

    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });
});
