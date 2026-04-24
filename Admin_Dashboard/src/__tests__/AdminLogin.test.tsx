import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import AdminLogin from "@/pages/AdminLogin";

vi.mock("@/lib/api", () => ({
  adminApi: {
    login: vi.fn().mockResolvedValue({ token: "t", admin: { id: "1", username: "admin" } }),
    signup: vi.fn().mockResolvedValue({ token: "t", admin: { id: "1", username: "admin" } }),
  },
}));

test("renders admin login form", () => {
  render(
    <MemoryRouter>
      <AdminLogin />
    </MemoryRouter>
  );

  expect(screen.getByText(/leftover link – admin/i)).toBeInTheDocument();
  expect(screen.getByText(/sign in to manage user requests/i)).toBeInTheDocument();
  // Basic sanity checks for form fields
  expect(screen.getByText(/username/i)).toBeInTheDocument();
  expect(screen.getByText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
});

