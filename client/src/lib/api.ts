/**
 * API client for LeftoverLink backend.
 * Replace mockApi with this when using the real FastAPI backend.
 *
 * Usage: Set VITE_API_BASE=http://localhost:8000 in .env
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function getToken(): string | null {
  const raw = localStorage.getItem("leftoverlink_auth_session_v1");
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { token?: string })?.token ?? null;
  } catch {
    return null;
  }
}

function setSession(token: string, user: unknown) {
  localStorage.setItem(
    "leftoverlink_auth_session_v1",
    JSON.stringify({ token, userId: (user as { id: string }).id }),
  );
  localStorage.setItem(
    "leftoverlink_auth_current_user_v1",
    JSON.stringify(user),
  );
}

function clearSession() {
  localStorage.removeItem("leftoverlink_auth_session_v1");
  localStorage.removeItem("leftoverlink_auth_current_user_v1");
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail || "Request failed");
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

type DonationStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";
type FoodCategory =
  | "Cooked Meals"
  | "Groceries"
  | "Bakery"
  | "Fruits"
  | "Mixed";

type Filters = {
  q?: string;
  category?: FoodCategory | "All";
  status?: DonationStatus | "All";
};

export type DeliverTaskResponse = {
  id: string;
  donationId: string;
  volunteerId: string;
  step: string;
  checklist: {
    sealed: boolean;
    labelled: boolean;
    noLeak: boolean;
    onTime: boolean;
    note: string;
  };
  updatedAt: string;
  feedbackUrl?: string;
  emailAttempted?: boolean;
  emailSent?: boolean;
  emailError?: string;
};

export const api = {
  auth: {
    async registerDonor(input: {
      username: string;
      password: string;
      fullName: string;
      phone: string;
      email?: string;
      organization?: string;
      aadhaarLast4?: string;
      aadhaarConsent: boolean;
      idFrontFile?: File;
      idBackFile?: File;
      foodSafetyCertFile?: File;
    }) {
      const idFrontImage = input.idFrontFile
        ? await fileToDataUrl(input.idFrontFile)
        : undefined;
      const idBackImage = input.idBackFile
        ? await fileToDataUrl(input.idBackFile)
        : undefined;
      const foodSafetyCertImage = input.foodSafetyCertFile
        ? await fileToDataUrl(input.foodSafetyCertFile)
        : undefined;

      const res = await fetchApi<{ token?: string; user: unknown; pending: boolean }>(
        "/auth/register/donor",
        {
          method: "POST",
          body: JSON.stringify({
            username: input.username,
            password: input.password,
            fullName: input.fullName,
            phone: input.phone,
            email: input.email || undefined,
            organization: input.organization || undefined,
            aadhaarLast4: input.aadhaarLast4 || undefined,
            aadhaarConsent: input.aadhaarConsent,
            idFrontImage,
            idBackImage,
            foodSafetyCertImage,
          }),
        },
      );
      if (res.pending) {
        return { user: res.user, pending: true as const };
      }
      if (res.token) setSession(res.token, res.user);
      return res.user;
    },

    async registerVolunteer(input: {
      username: string;
      password: string;
      fullName: string;
      phone: string;
      email?: string;
      city?: string;
      hasVehicle?: boolean;
      aadhaarLast4?: string;
      aadhaarConsent: boolean;
      volunteerIdType: string;
      volunteerIdProofFile?: File;
    }) {
      const volunteerIdProofImage = input.volunteerIdProofFile
        ? await fileToDataUrl(input.volunteerIdProofFile)
        : undefined;

      const res = await fetchApi<{ token?: string; user: unknown; pending: boolean }>(
        "/auth/register/volunteer",
        {
          method: "POST",
          body: JSON.stringify({
            username: input.username,
            password: input.password,
            fullName: input.fullName,
            phone: input.phone,
            email: input.email || undefined,
            city: input.city || undefined,
            hasVehicle: !!input.hasVehicle,
            aadhaarLast4: input.aadhaarLast4 || undefined,
            aadhaarConsent: input.aadhaarConsent,
            volunteerIdType: input.volunteerIdType,
            volunteerIdProofImage,
          }),
        },
      );
      if (res.pending) {
        return { user: res.user, pending: true as const };
      }
      if (res.token) setSession(res.token, res.user);
      return res.user;
    },

    async login(input: {
      username: string;
      password: string;
      token?: string | null;
      location?: { lat: number; lng: number };
    }) {
      try {
        const res = await fetchApi<{ token: string; user: unknown }>(
          "/auth/login",
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        );
        setSession(res.token, res.user);
        return { token: res.token, user: res.user };
      } catch (e: unknown) {
        const err = e as { message?: string };
        if (err?.message === "pending" || err?.message === "rejected") {
          throw new Error(err.message);
        }
        throw e;
      }
    },

    async me() {
      return fetchApi<unknown>("/auth/me");
    },

    async logout() {
      try {
        await fetchApi<{ ok: boolean }>("/auth/logout", { method: "POST" });
      } catch {
        // Even if API call fails, clear local auth to avoid trapping user.
      } finally {
        clearSession();
      }
    },

    isLoggedIn() {
      return !!getToken();
    },

    async resetAuthDemo() {
      await fetchApi("/auth/reset-demo", { method: "POST" });
      clearSession();
    },

    async fcmDebug() {
      return fetchApi<{
        username: string;
        role: string;
        hasFcmToken: boolean;
        tokenLength: number;
        firebaseAdminOk: boolean;
        credentialsFileExists: boolean;
      }>("/auth/fcm-debug");
    },

    async fcmTokenSave(token: string) {
      return fetchApi<{ ok: boolean; tokenLength: number }>("/auth/fcm-token", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    },

    async fcmTestPush() {
      return fetchApi<{
        ok: boolean;
        fcmDetail: Record<string, unknown>;
        hint: string;
      }>("/auth/fcm-test-push", { method: "POST" });
    },
  },

  async listDonations(filters: Filters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category && filters.category !== "All")
      params.set("category", filters.category);
    if (filters.status && filters.status !== "All")
      params.set("status", filters.status);
    const qs = params.toString();
    return fetchApi<unknown[]>(`/donations${qs ? `?${qs}` : ""}`);
  },

  async getDonation(id: string) {
    return fetchApi<unknown | null>(`/donations/${id}`);
  },

  async createDonation(payload: Record<string, unknown>) {
    return fetchApi<unknown>("/donations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async acceptPickup(
    donationId: string,
    volunteer: { id: string; name: string; phoneMasked: string },
  ) {
    return fetchApi<{ donation: unknown; task: unknown }>(
      `/donations/${donationId}/accept`,
      {
        method: "POST",
        body: JSON.stringify({
          volunteerId: volunteer.id,
          volunteerName: volunteer.name,
          volunteerPhoneMasked: volunteer.phoneMasked,
        }),
      },
    );
  },

  async listTasks(volunteerId: string) {
    return fetchApi<unknown[]>(
      `/tasks?volunteer_id=${encodeURIComponent(volunteerId)}`,
    );
  },

  async getTask(taskId: string) {
    return fetchApi<unknown | null>(`/tasks/${taskId}`);
  },

  async advanceTask(taskId: string) {
    return fetchApi<unknown>(`/tasks/${taskId}/advance`, {
      method: "PATCH",
    });
  },

  /** Mark task as delivered and submit end-user details. Sends feedback link to recipient. */
  async deliverTask(
    taskId: string,
    endUser: {
      name: string;
      age?: number;
      address: string;
      email?: string;
      phone?: string;
    }
  ) {
    return fetchApi<DeliverTaskResponse>(`/tasks/${taskId}/deliver`, {
      method: "POST",
      body: JSON.stringify({ endUser }),
    });
  },

  async saveChecklist(taskId: string, patch: Record<string, unknown>) {
    return fetchApi<unknown>(`/tasks/${taskId}/checklist`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async resetDemo() {
    await fetchApi("/demo/reset", { method: "POST" });
  },

  /** Public feedback by token (no auth). */
  feedback: {
    async getByToken(token: string) {
      return fetchApi<{ donorName: string; volunteerName: string; alreadySubmitted: boolean }>(
        `/feedback/by-token/${encodeURIComponent(token)}`
      );
    },
    async submit(token: string, body: { rating: number; comment?: string }) {
      return fetchApi<{ ok: boolean; message: string }>(
        `/feedback/by-token/${encodeURIComponent(token)}`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },
  },

  /** Google Maps API - Geocoding & Places (requires backend GOOGLE_MAPS_API_KEY) */
  maps: {
    async geocode(address: string) {
      return fetchApi<{
        results: {
          formatted_address?: string;
          place_id?: string;
          location: { lat: number; lng: number };
        }[];
        location: {
          lat: number;
          lng: number;
          formatted_address?: string;
        } | null;
      }>(`/api/maps/geocode?address=${encodeURIComponent(address)}`);
    },
    async reverseGeocode(lat: number, lng: number) {
      return fetchApi<{
        address: string | null;
        results: { formatted_address?: string; place_id?: string }[];
      }>(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
    },
    async placesAutocomplete(input: string, sessionToken?: string) {
      const params = new URLSearchParams({ input });
      if (sessionToken) params.set("session_token", sessionToken);
      return fetchApi<{
        predictions: {
          place_id?: string;
          description?: string;
          structured_formatting?: unknown;
        }[];
      }>(`/api/maps/places/autocomplete?${params}`);
    },
    async placeDetails(placeId: string) {
      return fetchApi<{
        place_id?: string;
        formatted_address?: string;
        location?: { lat: number; lng: number };
      }>(`/api/maps/places/details?place_id=${encodeURIComponent(placeId)}`);
    },
  },
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}
