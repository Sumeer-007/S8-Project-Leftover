import type { Donation, Task } from "@/types";

export const seedDonations: Donation[] = [
  {
    id: "D-1001",
    donorName: "Asha Menon",
    donorPhoneMasked: "+44 *** *** 128",
    createdAt: "2026-01-07T08:45:00Z",
    pickupBy: "2026-01-07T12:30:00Z",
    status: "PENDING",
    category: "Cooked Meals",
    servingsEstimate: 25,
    items: [
      { name: "Veg biryani", quantity: 15, unit: "plates" },
      { name: "Raita packs", quantity: 10, unit: "packs" },
    ],
    pickupLocation: {
      label: "Norwich City Centre",
      address: "23 Market St, Norwich NR2 1XX",
      lat: 52.6287,
      lng: 1.2923,
    },
    dietaryTags: ["Vegetarian"],
    notes: "Packed & kept warm. Please bring an insulated bag.",
  },
  {
    id: "D-1002",
    donorName: "GreenGrocer Ltd",
    donorPhoneMasked: "+44 *** *** 554",
    createdAt: "2026-01-07T09:10:00Z",
    pickupBy: "2026-01-07T14:00:00Z",
    status: "ASSIGNED",
    category: "Fruits",
    servingsEstimate: 40,
    items: [
      { name: "Bananas", quantity: 8, unit: "kg" },
      { name: "Apples", quantity: 6, unit: "kg" },
    ],
    pickupLocation: {
      label: "Warehouse",
      address: "10 Riverside Rd, Norwich NR1 2AB",
      lat: 52.624,
      lng: 1.305,
    },
    assignedVolunteer: {
      id: "V-22",
      name: "Sam Thomas",
      phoneMasked: "+44 *** *** 909",
    },
  },
  {
    id: "D-1003",
    donorName: "Priya K",
    donorPhoneMasked: "+44 *** *** 771",
    createdAt: "2026-01-06T18:25:00Z",
    pickupBy: "2026-01-06T21:00:00Z",
    status: "DELIVERED",
    category: "Bakery",
    servingsEstimate: 18,
    items: [{ name: "Bread loaves", quantity: 12, unit: "packs" }],
    pickupLocation: {
      label: "Eaton",
      address: "5 Church Ln, Norwich NR4 6NP",
      lat: 52.607,
      lng: 1.275,
    },
    assignedVolunteer: {
      id: "V-07",
      name: "Nina Patel",
      phoneMasked: "+44 *** *** 404",
    },
  },
];

export const seedTasks: Task[] = [
  {
    id: "T-9001",
    donationId: "D-1002",
    volunteerId: "V-22",
    step: "STARTED",
    checklist: {
      sealed: true,
      labelled: true,
      noLeak: true,
      onTime: true,
      note: "",
    },
    updatedAt: "2026-01-07T10:05:00Z",
  },
];
