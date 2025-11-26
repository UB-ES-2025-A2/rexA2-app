import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import Alert from "../../src/components/Alert/Alert";

describe("Alert", () => {
  test("muestra el mensaje cuando se le pasa un detail de tipo string", () => {
    const onClose = vi.fn();

    render(<Alert detail="Mensaje de error" type="error" onClose={onClose} />);

    expect(screen.getByText("Mensaje de error")).toBeInTheDocument();
  });

  test("llama a onClose automáticamente después de autoHideMs", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <Alert
        detail="Mensaje temporal"
        type="success"
        onClose={onClose}
        autoHideMs={1000}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(onClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
