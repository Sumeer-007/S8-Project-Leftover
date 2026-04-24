export type UserRole = "donor" | "volunteer";

export type DonationStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";
export type FoodCategory =
  | "Cooked Meals"
  | "Groceries"
  | "Bakery"
  | "Fruits"
  | "Mixed";

export type DonationItem = {
  name: string;
  quantity: number;
  unit: "packs" | "kg" | "plates" | "boxes";
};

export type Location = {
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export type DeliveryRecipient = {
  name: string;
  age?: number;
  address: string;
  email?: string;
  phone?: string;
};

export type DonationFeedback = {
  rating: number;
  comment?: string;
  submittedAt: string;
};

export type Donation = {
  id: string;
  donorName: string;
  donorPhoneMasked: string;
  createdAt: string;
  pickupBy: string;
  status: DonationStatus;
  category: FoodCategory;
  servingsEstimate: number;
  items: DonationItem[];
  pickupLocation: Location;
  notes?: string;
  dietaryTags?: string[];
  assignedVolunteer?: { id: string; name: string; phoneMasked: string };
  deliveryRecipient?: DeliveryRecipient;
  feedback?: DonationFeedback;
};

export type TaskStep = "READY" | "STARTED" | "PICKED_UP" | "DELIVERED";

export type Task = {
  id: string;
  donationId: string;
  volunteerId: string;
  step: TaskStep;
  checklist: {
    sealed: boolean;
    labelled: boolean;
    noLeak: boolean;
    onTime: boolean;
    note?: string;
  };
  updatedAt: string;
};

export type Role = "DONOR" | "VOLUNTEER";

export type BaseUser = {
  id: string;
  role: Role;
  username: string;
  createdAt: string;
};

export type DonorProfile = {
  fullName: string;
  phone: string;
  organization?: string;
  aadhaarLast4?: string;
  aadhaarConsent: boolean;
  idFrontImage?: string;
  idBackImage?: string;
  foodSafetyCertImage?: string;
};

export type VolunteerProfile = {
  fullName: string;
  phone: string;
  city?: string;
  hasVehicle?: boolean;
  aadhaarLast4?: string;
  aadhaarConsent?: boolean;
  volunteerIdType?: string;
  volunteerIdProofImage?: string;
};

export type User =
  | (BaseUser & { role: "DONOR"; donor: DonorProfile })
  | (BaseUser & { role: "VOLUNTEER"; volunteer: VolunteerProfile });

export type AuthSession = {
  token: string;
  userId: string;
};
