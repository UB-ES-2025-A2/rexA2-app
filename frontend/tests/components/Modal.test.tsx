import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import Modal from "../../src/components/Modal";

describe("Modal", () => {
  test("no renderiza contenido cuando open es false", () => {
    const onClose = vi.fn();

    const { queryByText } = render(
      <Modal open={false} onClose={onClose}>
        <div>Contenido modal</div>
      </Modal>
    );

    expect(queryByText("Contenido modal")).toBeNull();
  });

  test("muestra el contenido cuando open es true", () => {
    const onClose = vi.fn();

    render(
      <Modal open={true} onClose={onClose}>
        <div>Contenido modal</div>
      </Modal>
    );

    expect(screen.getByText("Contenido modal")).toBeInTheDocument();
  });

  test("llama a onClose cuando se pulsa Escape", () => {
    const onClose = vi.fn();

    render(
      <Modal open={true} onClose={onClose}>
        <div>Contenido modal</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("llama a onClose cuando se pulsa el botón de cerrar (X)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = render(
      <Modal open={true} onClose={onClose}>
        <div>Contenido modal</div>
      </Modal>
    );

    const closeButton = container.querySelector(
      'button[aria-label="Close"]'
    ) as HTMLButtonElement | null;

    expect(closeButton).not.toBeNull();

    if (closeButton) {
      await user.click(closeButton);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
