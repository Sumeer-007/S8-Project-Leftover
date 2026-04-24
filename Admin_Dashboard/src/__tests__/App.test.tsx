import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

function renderWithRouter(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
}

test("redirects root to /dashboard", () => {
  renderWithRouter(["/"]);
  // Without token, RequireAdmin should redirect to /login
  expect(screen.getByText(/leftover link – admin/i)).toBeInTheDocument();
});

test("shows admin login when no token and hitting /login", () => {
  renderWithRouter(["/login"]);
  expect(screen.getByText(/leftover link – admin/i)).toBeInTheDocument();
  expect(screen.getByText(/sign in to manage user requests/i)).toBeInTheDocument();
});

