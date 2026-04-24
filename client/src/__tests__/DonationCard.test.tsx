import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { DonationCard } from "../components/donation-card/DonationCard";
import type { Donation } from "../types";
import { test } from "vitest";
import { expect } from "vitest";
import React from "react";

const baseDonation: Donation = {
  id: "D-1234",
  donorName: "Test Donor",
  donorPhoneMasked: "+44 *** *** 111",
  createdAt: new Date().toISOString(),
  pickupBy: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  status: "PENDING",
  category: "Cooked Meals",
  servingsEstimate: 10,
  items: [{ name: "Item 1", quantity: 2, unit: "plates" }],
  pickupLocation: {
    label: "Test Location",
    address: "1 Test St",
    lat: 0,
    lng: 0,
  },
  notes: "",
  dietaryTags: [],
  assignedVolunteer: undefined,
  deliveryRecipient: undefined,
  feedback: undefined,
};

test("renders donation card with category and servings", () => {
  render(<DonationCard d={baseDonation} />);
  expect(screen.getByText("Cooked Meals")).toBeDefined();
  expect(screen.getByText(/10 servings/i)).toBeDefined();
  expect(screen.getByText(/Test Location/i)).toBeDefined();
});
