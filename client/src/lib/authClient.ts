export type DonorProfile = {
  fullName: string;
  phone: string;
  organization?: string;
  aadhaarLast4?: string;
  aadhaarConsent: boolean;
  idFrontImage?: string;
  idBackImage?: string;
};

export type VolunteerProfile = {
  fullName: string;
  phone: string;
  city?: string;
  hasVehicle?: boolean;
};

export type User =
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

const AUTH_SESSION_KEY = "leftoverlink_auth_session_v1";
const AUTH_CURRENT_USER_KEY = "leftoverlink_auth_current_user_v1";

export function getSessionTokenSync(): string | null {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { token: string })?.token ?? null;
  } catch {
    return null;
  }
}

export function getCurrentUserSync(): User | null {
  const raw = localStorage.getItem(AUTH_CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isLoggedInSync(): boolean {
  return !!getSessionTokenSync() && !!getCurrentUserSync();
}

export function getHomePathFor(user: User): string {
  return user.role === "DONOR" ? "/donor/home" : "/volunteer/home";
}
