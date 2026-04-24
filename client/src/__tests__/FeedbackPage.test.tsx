import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import FeedbackPage from "../screens/feedback/FeedbackPage";
import { test } from "vitest";
import { expect } from "vitest";
import React from "react";

vi.mock("@/lib/api", () => ({
  api: {
    feedback: {
      getByToken: vi.fn().mockResolvedValue({
        donorName: "Donor A",
        volunteerName: "Volunteer B",
        alreadySubmitted: false,
      }),
      submit: vi.fn().mockResolvedValue({ ok: true, message: "Thanks" }),
    },
  },
}));

test("renders feedback page with donor and volunteer names", async () => {
  render(
    <MemoryRouter initialEntries={["/feedback/test-token"]}>
      <Routes>
        <Route path="/feedback/:token" element={<FeedbackPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/share your feedback/i)).toBeDefined();
  expect(await screen.findByText(/donor a/i)).toBeDefined();
  expect(await screen.findByText(/volunteer b/i)).toBeDefined();
});
