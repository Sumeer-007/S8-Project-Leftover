import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { test } from "vitest";
import { expect } from "vitest";
import React from "react";

function renderWithRouter(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

test("unauthenticated user at root is redirected to login", () => {
  window.localStorage.clear();
  renderWithRouter(["/"]);
  expect(screen.getByText(/welcome back/i)).toBeDefined();
});
