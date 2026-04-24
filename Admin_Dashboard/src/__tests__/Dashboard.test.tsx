import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Dashboard from "@/pages/Dashboard";

vi.mock("@/lib/api", () => ({
  adminApi: {
    listPendingUsers: vi.fn().mockResolvedValue([]),
    approveUser: vi.fn(),
    rejectUser: vi.fn(),
    logout: vi.fn(),
  },
  mainApi: {
    listDonations: vi.fn().mockResolvedValue([]),
  },
}));

test("renders admin dashboard headers", async () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

  expect(
    screen.getByText(/leftover link · admin/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/pending approvals/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/donations & feedback/i)
  ).toBeInTheDocument();
});

