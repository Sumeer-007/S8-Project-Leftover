import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { GradientHeader } from "@/components/gradient-header/GradientHeader";

test("renders title and optional subtitle", () => {
  render(<GradientHeader title="Test Title" subtitle="Test subtitle" />);
  expect(screen.getByText("Test Title")).toBeInTheDocument();
  expect(screen.getByText("Test subtitle")).toBeInTheDocument();
});
