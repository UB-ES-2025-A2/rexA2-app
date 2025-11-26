import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import TextField from "../../src/components/TextField";

describe("TextField", () => {
  test("asocia correctamente el label con el input mediante id/htmlFor", () => {
    render(
      <TextField
        label="Nombre"
        name="nombre"
        id="nombre"
        placeholder="Escribe tu nombre"
      />
    );

    const input = screen.getByLabelText("Nombre");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "nombre");
    expect(input).toHaveClass("field__input");
  });

  test("muestra el mensaje de error cuando se pasa la prop error", () => {
    render(
      <TextField
        label="Email"
        name="email"
        id="email"
        error="Formato de email inválido"
      />
    );

    expect(screen.getByText("Formato de email inválido")).toBeInTheDocument();
  });
});
