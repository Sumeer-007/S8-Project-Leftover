import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { GradientHeader } from "../components/gradient-header/GradientHeader";
import { test } from "vitest";
import { expect } from "vitest";
import React from "react";

test("renders title and optional subtitle", () => {
  render(<GradientHeader title="Test Title" subtitle="Test subtitle" />);
  expect(screen.getByText("Test Title")).toBeDefined();
  expect(screen.getByText("Test subtitle")).toBeDefined();
});
