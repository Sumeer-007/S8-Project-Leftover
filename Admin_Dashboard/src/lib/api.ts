/**
 * Admin API client – talks to the Admin backend (separate build, runs on port 8001).
 * Set VITE_ADMIN_API_BASE=http://localhost:8001 in .env (default).
 */

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || "http://localhost:8001";

const ADMIN_TOKEN_KEY = "leftoverlink_admin_token_v1";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function fetchApi<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options;
  const authToken = token !== undefined ? token : getAdminToken();
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail || "Request failed");
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

/** Step 1 AI pre-check (OCR + heuristics) — produced by Admin API (Admin_Dashboard/server) */
export type VerificationAiReport = {
  version?: number;
  generatedAt?: string;
  ocrEngine?: string;
  role?: string;
  step1Overall?: "pass" | "warn" | "fail";
  step1Summary?: string;
  donor?: Record<string, unknown> | null;
  volunteer?: Record<string, unknown> | null;
};

export type PendingUser = {
  id: string;
  role: string;
  username: string;
  status: string;
  email: string | null;
  createdAt: string;
  fullName: string;
  phone: string;
  organization?: string | null;
  city?: string | null;
  /** Donor: Aadhaar (owner) & food safety cert */
  aadhaarLast4?: string | null;
  idFrontImage?: string | null;
  idBackImage?: string | null;
  foodSafetyCertImage?: string | null;
  /** Volunteer: Aadhaar & volunteer ID proof */
  volunteerIdType?: string | null;
  volunteerIdProofImage?: string | null;
  /** Step 1 — automated document pre-check */
  verificationAi?: VerificationAiReport | null;
};

export const adminApi = {
  async login(username: string, password: string) {
    const res = await fetchApi<{ token: string; admin: { id: string; username: string } }>(
      "/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    );
    setAdminToken(res.token);
    return res;
  },

  async signup(username: string, password: string) {
    const res = await fetchApi<{ token: string; admin: { id: string; username: string } }>(
      "/signup",
      { method: "POST", body: JSON.stringify({ username, password }) }
    );
    setAdminToken(res.token);
    return res;
  },

  async me() {
    return fetchApi<{ id: string; username: string }>("/me");
  },

  async listPendingUsers(): Promise<PendingUser[]> {
    return fetchApi<PendingUser[]>("/pending-users");
  },

  async listAllUsers(): Promise<PendingUser[]> {
    return fetchApi<PendingUser[]>("/users");
  },

  async approveUser(userId: string) {
    return fetchApi<{ ok: boolean; user: PendingUser }>(
      `/users/${userId}/approve`,
      { method: "POST" }
    );
  },

  async rejectUser(userId: string) {
    return fetchApi<{ ok: boolean; user: PendingUser }>(
      `/users/${userId}/reject`,
      { method: "POST" }
    );
  },

  logout() {
    clearAdminSession();
  },
};

/**
 * Main app API (donations, feedback) – Admin is built/deployed separately and calls this API.
 * Dev: VITE_MAIN_API_BASE=http://localhost:8000 (or leave unset).
 * Production build: set VITE_MAIN_API_BASE to your main API URL (e.g. https://api.yourdomain.com)
 * so the built Admin app can load donations. The main API must allow this Admin origin in CORS (ADMIN_CORS_ORIGINS).
 */
const MAIN_API_BASE = import.meta.env.VITE_MAIN_API_BASE || "http://localhost:8000";

export type DonationWithFeedback = {
  id: string;
  donorName: string;
  donorPhoneMasked: string;
  createdAt: string;
  pickupBy: string;
  status: string;
  category: string;
  servingsEstimate: number;
  items: { name: string; quantity: number; unit: string }[];
  pickupLocation: { label: string; address: string };
  notes?: string;
  assignedVolunteer?: { id: string; name: string; phoneMasked: string };
  deliveryRecipient?: { name: string; age?: number; address: string; email?: string; phone?: string };
  feedback?: { rating: number; comment?: string; submittedAt: string };
};

export const mainApi = {
  async listDonations(): Promise<DonationWithFeedback[]> {
    const res = await fetch(`${MAIN_API_BASE}/donations`);
    if (!res.ok) throw new Error("Failed to load donations");
    return res.json();
  },
};
