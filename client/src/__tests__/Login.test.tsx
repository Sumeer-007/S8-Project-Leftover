import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import Login from "@/screens/auth/Login";

test("renders login screen headings and fields", () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  expect(
    screen.getByRole("heading", { name: /leftover link/i, level: 1 })
  ).toBeInTheDocument();
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
});

