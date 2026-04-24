import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import Login from "../screens/auth/Login";
import { test } from "vitest";
import { expect } from "vitest";
import React from "react";

test("renders login screen headings and fields", () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: /leftover link/i, level: 1 }),
  ).toBeDefined();
  expect(screen.getByText(/welcome back/i)).toBeDefined();
  expect(screen.getByRole("button", { name: /login/i })).toBeDefined();
});
