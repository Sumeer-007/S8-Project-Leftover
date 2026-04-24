import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import VolunteerTasks from "@/screens/volunteer/VolunteerTasks";

test("renders volunteer tasks header", () => {
  render(
    <MemoryRouter>
      <VolunteerTasks />
    </MemoryRouter>,
  );

  expect(screen.getByText(/my tasks/i)).toBeInTheDocument();
});
