import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { StatusPill } from "../components/status-pill/StatusPill";
import { test } from "vitest";
import { expect } from "vitest";
import React from "react";

test("renders Pending status label", () => {
  render(<StatusPill status={"PENDING"} />);
  expect(screen.getByText("Pending")).toBeDefined();
});

test("renders Delivered status label", () => {
  render(<StatusPill status="DELIVERED" />);
  expect(screen.getByText("Delivered")).toBeDefined();
});
