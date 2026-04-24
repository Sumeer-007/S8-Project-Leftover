import type { Donation, DonationStatus, FoodCategory, Task } from "@/types";
import { seedDonations, seedTasks } from "./mockData";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Filters = {
  q?: string;
  category?: FoodCategory | "All";
  status?: DonationStatus | "All";
};

const STORAGE_KEY = "leftoverlink_demo_store_v1";

// NEW auth storage keys
const AUTH_STORE_KEY = "leftoverlink_auth_store_v1";
const AUTH_SESSION_KEY = "leftoverlink_auth_session_v1";
const AUTH_CURRENT_USER_KEY = "leftoverlink_auth_current_user_v1";

type Store = { donations: Donation[]; tasks: Task[] };

function loadStore(): Store {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { donations: seedDonations, tasks: seedTasks };
  try {
    return JSON.parse(raw) as Store;
  } catch {
    return { donations: seedDonations, tasks: seedTasks };
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function id(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

type DonorProfile = {
  fullName: string;
  phone: string;
  organization?: string;

  // Recommend: keep it safe for demo
  aadhaarLast4?: string;
  aadhaarConsent: boolean;

  // data URLs (base64) for demo
  idFrontImage?: string;
  idBackImage?: string;
};

type VolunteerProfile = {
  fullName: string;
  phone: string;
  city?: string;
  hasVehicle?: boolean;
};

type User =
  | {
      id: string;
      role: "DONOR";
      username: string;
      createdAt: string;
      donor: DonorProfile;
    }
  | {
      id: string;
      role: "VOLUNTEER";
      username: string;
      createdAt: string;
      volunteer: VolunteerProfile;
    };

type AuthStore = {
  users: User[];
  passwordsByUsername: Record<string, string>;
};

function loadAuthStore(): AuthStore {
  const raw = localStorage.getItem(AUTH_STORE_KEY);
  if (!raw) return { users: [], passwordsByUsername: {} };
  try {
    const parsed = JSON.parse(raw) as AuthStore;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      passwordsByUsername: parsed.passwordsByUsername ?? {},
    };
  } catch {
    return { users: [], passwordsByUsername: {} };
  }
}

function saveAuthStore(store: AuthStore) {
  localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(store));
}

function setSession(token: string, user: User) {
  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({ token, userId: user.id })
  );
  localStorage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_CURRENT_USER_KEY);
}

function getCurrentUser(): User | null {
  const raw = localStorage.getItem(AUTH_CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function uid(prefix: string) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export const mockApi = {
  // -----------------------------
  // ✅ AUTH API (NEW)
  // -----------------------------
  auth: {
    async registerDonor(input: {
      username: string;
      password: string;
      fullName: string;
      phone: string;
      organization?: string;

      // safer demo field
      aadhaarLast4?: string;
      aadhaarConsent: boolean;

      // optional file uploads
      idFrontFile?: File;
      idBackFile?: File;
    }) {
      await sleep(250);
      const store = loadAuthStore();

      const uname = input.username.trim().toLowerCase();
      if (!uname) throw new Error("Username required");
      if (store.passwordsByUsername[uname])
        throw new Error("Username already exists");
      if (!input.password || input.password.length < 4)
        throw new Error("Password must be at least 4 characters");
      if (!input.fullName.trim()) throw new Error("Full name required");
      if (!input.phone.trim()) throw new Error("Phone required");
      if (!input.aadhaarConsent) throw new Error("Consent required");

      const idFrontImage = input.idFrontFile
        ? await fileToDataUrl(input.idFrontFile)
        : undefined;
      const idBackImage = input.idBackFile
        ? await fileToDataUrl(input.idBackFile)
        : undefined;

      const user: User = {
        id: uid("U"),
        role: "DONOR",
        username: uname,
        createdAt: new Date().toISOString(),
        donor: {
          fullName: input.fullName.trim(),
          phone: input.phone.trim(),
          organization: input.organization?.trim() || undefined,
          aadhaarLast4: input.aadhaarLast4?.trim() || undefined,
          aadhaarConsent: input.aadhaarConsent,
          idFrontImage,
          idBackImage,
        },
      };

      store.users.push(user);
      store.passwordsByUsername[uname] = input.password;
      saveAuthStore(store);

      return user;
    },

    async registerVolunteer(input: {
      username: string;
      password: string;
      fullName: string;
      phone: string;
      city?: string;
      hasVehicle?: boolean;
    }) {
      await sleep(250);
      const store = loadAuthStore();

      const uname = input.username.trim().toLowerCase();
      if (!uname) throw new Error("Username required");
      if (store.passwordsByUsername[uname])
        throw new Error("Username already exists");
      if (!input.password || input.password.length < 4)
        throw new Error("Password must be at least 4 characters");
      if (!input.fullName.trim()) throw new Error("Full name required");
      if (!input.phone.trim()) throw new Error("Phone required");

      const user: User = {
        id: uid("U"),
        role: "VOLUNTEER",
        username: uname,
        createdAt: new Date().toISOString(),
        volunteer: {
          fullName: input.fullName.trim(),
          phone: input.phone.trim(),
          city: input.city?.trim() || undefined,
          hasVehicle: !!input.hasVehicle,
        },
      };

      store.users.push(user);
      store.passwordsByUsername[uname] = input.password;
      saveAuthStore(store);

      return user;
    },

    async login(input: { username: string; password: string }) {
      await sleep(220);
      const store = loadAuthStore();
      const uname = input.username.trim().toLowerCase();
      const pass = store.passwordsByUsername[uname];

      if (!pass || pass !== input.password)
        throw new Error("Invalid username or password");

      const user = store.users.find((u) => u.username === uname);
      if (!user) throw new Error("Account not found");

      const token = `demo-token-${user.id}-${Date.now()}`;
      setSession(token, user);

      return { token, user };
    },

    async me() {
      await sleep(120);
      return getCurrentUser();
    },

    logout() {
      clearSession();
    },

    isLoggedIn() {
      return !!getCurrentUser();
    },

    resetAuthDemo() {
      localStorage.removeItem(AUTH_STORE_KEY);
      clearSession();
    },
  },

  // -----------------------------
  // ✅ DONATIONS / TASKS (UNCHANGED)
  // -----------------------------
  async listDonations(filters: Filters = {}) {
    await sleep(180);
    const store = loadStore();
    const q = (filters.q ?? "").toLowerCase();

    return store.donations
      .filter((d) =>
        filters.category && filters.category !== "All"
          ? d.category === filters.category
          : true
      )
      .filter((d) =>
        filters.status && filters.status !== "All"
          ? d.status === filters.status
          : true
      )
      .filter((d) => {
        if (!q) return true;
        const hay =
          `${d.category} ${d.pickupLocation.label} ${d.pickupLocation.address} ${d.status}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => +new Date(a.pickupBy) - +new Date(b.pickupBy));
  },

  async getDonation(id: string) {
    await sleep(120);
    const store = loadStore();
    return store.donations.find((d) => d.id === id) ?? null;
  },

  async createDonation(payload: Omit<Donation, "id" | "createdAt" | "status">) {
    await sleep(220);
    const store = loadStore();
    const donation: Donation = {
      ...payload,
      id: id("D"),
      createdAt: new Date().toISOString(),
      status: "PENDING",
    };
    store.donations = [donation, ...store.donations];
    saveStore(store);
    return donation;
  },

  async acceptPickup(
    donationId: string,
    volunteer: { id: string; name: string; phoneMasked: string }
  ) {
    await sleep(220);
    const store = loadStore();
    const donation = store.donations.find((d) => d.id === donationId);
    if (!donation) throw new Error("Donation not found");
    if (donation.status !== "PENDING")
      throw new Error("Donation is not available");

    donation.status = "ASSIGNED";
    donation.assignedVolunteer = volunteer;

    const task: Task = {
      id: id("T"),
      donationId,
      volunteerId: volunteer.id,
      step: "READY",
      checklist: {
        sealed: false,
        labelled: false,
        noLeak: false,
        onTime: false,
        note: "",
      },
      updatedAt: new Date().toISOString(),
    };
    store.tasks = [task, ...store.tasks];

    saveStore(store);
    return { donation, task };
  },

  async listTasks(volunteerId: string) {
    await sleep(150);
    const store = loadStore();
    return store.tasks
      .filter((t) => t.volunteerId === volunteerId)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  },

  async getTask(taskId: string) {
    await sleep(120);
    const store = loadStore();
    return store.tasks.find((t) => t.id === taskId) ?? null;
  },

  async advanceTask(taskId: string) {
    await sleep(160);
    const store = loadStore();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");

    const next =
      task.step === "READY"
        ? "STARTED"
        : task.step === "STARTED"
        ? "PICKED_UP"
        : "DELIVERED";
    task.step = next;
    task.updatedAt = new Date().toISOString();

    // mirror donation status
    const donation = store.donations.find((d) => d.id === task.donationId);
    if (donation) {
      donation.status =
        next === "STARTED"
          ? "ASSIGNED"
          : next === "PICKED_UP"
          ? "PICKED_UP"
          : next === "DELIVERED"
          ? "DELIVERED"
          : donation.status;
    }

    saveStore(store);
    return task;
  },

  async saveChecklist(taskId: string, patch: Partial<Task["checklist"]>) {
    await sleep(140);
    const store = loadStore();
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");
    task.checklist = { ...task.checklist, ...patch };
    task.updatedAt = new Date().toISOString();
    saveStore(store);
    return task;
  },

  resetDemo() {
    saveStore({ donations: seedDonations, tasks: seedTasks });
  },
};
