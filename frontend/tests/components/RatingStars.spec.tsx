import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import StarRating from "../../src/components/StarRating";

function RatingStarsHarness({ initialValue = 0 }) {
  const [value, setValue] = useState(initialValue);
  return <StarRating value={value} onChange={setValue} />;
}

test("US25 - RatingStars refleja visualmente el cambio de valoración", async () => {
  const user = userEvent.setup();

  render(<RatingStarsHarness initialValue={2} />);

  const stars = screen.getAllByRole("radio");
  await user.click(stars[4]);

  expect(stars[4]).toHaveAttribute("aria-checked", "true");
});
