import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import AlertPortal from "../../src/components/Alert/AlertPortal";

describe("AlertPortal", () => {
  test("renderiza el Alert en el body mediante portal", () => {
    const onClose = vi.fn();

    render(
      <AlertPortal detail="Portal OK" type="success" onClose={onClose} />
    );

    expect(screen.getByText("Portal OK")).toBeInTheDocument();
  });
});
