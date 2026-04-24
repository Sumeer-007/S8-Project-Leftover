import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/status-pill/StatusPill";

test("renders Pending status label", () => {
  render(<StatusPill status="PENDING" />);
  expect(screen.getByText("Pending")).toBeInTheDocument();
});

test("renders Delivered status label", () => {
  render(<StatusPill status="DELIVERED" />);
  expect(screen.getByText("Delivered")).toBeInTheDocument();
});

