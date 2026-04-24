import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import DonorCreate from "@/screens/donor/DonorCreate";

test("renders donor create step headers", () => {
  render(
    <MemoryRouter>
      <DonorCreate />
    </MemoryRouter>
  );

  expect(screen.getByText(/create donation/i)).toBeInTheDocument();
  expect(screen.getByText(/food info/i)).toBeInTheDocument();
  expect(screen.getByText(/category/i)).toBeInTheDocument();
});

