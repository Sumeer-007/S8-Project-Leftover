import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import DonorCreate from "../screens/donor/DonorCreate";
import { test } from "vitest";
import { expect } from "vitest";
import React from "react";

test("renders donor create step headers", () => {
  render(
    <MemoryRouter>
      <DonorCreate />
    </MemoryRouter>,
  );

  expect(screen.getByText(/create donation/i)).toBeDefined();
  expect(screen.getByText(/food info/i)).toBeDefined();
  expect(screen.getByText(/category/i)).toBeDefined();
});
