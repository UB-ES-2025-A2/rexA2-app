import React from "react";
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import PasswordField from "../../src/components/PasswordField";

describe("PasswordField", () => {
  test("por defecto el input es de tipo password", () => {
    render(<PasswordField name="password" />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
  });

  test("al pulsar el toggle cambia entre password y text", async () => {
    const user = userEvent.setup();

    render(<PasswordField name="password" label="Contraseña" />);

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByLabelText("Mostrar contraseña");

    await user.click(toggle);

    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByLabelText("Ocultar contraseña")
    ).toBeInTheDocument();
  });
});
