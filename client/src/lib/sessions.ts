import type { UserRole } from "@/types";

const ROLE_KEY = "leftoverlink_role_v1";
const AUTH_KEY = "leftoverlink_authed_v1";
const PENDING_ROLE_KEY = "leftoverlink_pending_role_v1";

export function getRole(): UserRole | null {
  const v = localStorage.getItem(ROLE_KEY);
  return v === "donor" || v === "volunteer" ? v : null;
}

export function setRole(role: UserRole) {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearRole() {
  localStorage.removeItem(ROLE_KEY);
}

// Auth helpers (mock)
export function isAuthed(): boolean {
  return localStorage.getItem(AUTH_KEY) === "1";
}

export function setAuthed(v: boolean) {
  if (v) localStorage.setItem(AUTH_KEY, "1");
  else localStorage.removeItem(AUTH_KEY);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

// Role selection before login
export function setPendingRole(role: UserRole) {
  localStorage.setItem(PENDING_ROLE_KEY, role);
}

export function getPendingRole(): UserRole | null {
  const v = localStorage.getItem(PENDING_ROLE_KEY);
  return v === "donor" || v === "volunteer" ? v : null;
}

export function clearPendingRole() {
  localStorage.removeItem(PENDING_ROLE_KEY);
}

/** demo identities */
export const demoDonor = {
  id: "U-DONOR",
  name: "Demo Donor",
  phoneMasked: "+44 *** *** 111",
};
export const demoVolunteer = {
  id: "V-22",
  name: "Sam Thomas",
  phoneMasked: "+44 *** *** 909",
};
