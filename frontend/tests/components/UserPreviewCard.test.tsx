import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import UserPreviewCard from "../../src/components/UserViewCard/UserPreviewCard";

describe("UserPreviewCard", () => {
  test("muestra la imagen de avatar si avatar_url está definido", () => {
    render(
      <UserPreviewCard
        id="u1"
        username="eric"
        name="Eric Rubio"
        email="eric@example.com"
        avatar_url="https://example.com/avatar.png"
      />
    );

    const img = screen.getByAltText("Avatar de eric");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  test("muestra un placeholder con la inicial cuando no hay avatar_url", () => {
    render(
      <UserPreviewCard
        id="u1"
        username="eric"
        name="Eric"
        email="eric@example.com"
        avatar_url={null}
      />
    );

    const placeholder = screen.getByText("E");
    expect(placeholder).toBeInTheDocument();
  });

  test("llama a onClick cuando se hace click en la tarjeta", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    const { container } = render(
      <UserPreviewCard
        id="u1"
        username="eric"
        email="eric@example.com"
        avatar_url={null}
        onClick={handleClick}
      />
    );

    const card = container.querySelector(".user-card");
    expect(card).not.toBeNull();

    if (card) {
      await user.click(card);
    }

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
