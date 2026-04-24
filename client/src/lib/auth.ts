import type { User } from "@/types";

const AUTH_KEY = "ll_auth_v1";
const USER_KEY = "ll_user_v1"; // store current user snapshot for easy access (demo)

export function getAuthToken(): string | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token: string };
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token }));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCachedUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setCachedUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
