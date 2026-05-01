export type AppRole = "USER" | "ADMIN" | "SUPERADMIN";

export type AppUser = {
  id: string;
  phone?: string | null;
  email?: string;
  planTier: "FREE" | "PREMIUM";
  role: AppRole;
};

export function getStoredUser(): AppUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem("currentUser");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(localStorage.getItem("accessToken"));
}

export function logoutSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("currentUser");
}

export function storeSession(input: { accessToken: string; refreshToken: string; user: AppUser }) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("accessToken", input.accessToken);
  localStorage.setItem("refreshToken", input.refreshToken);
  localStorage.setItem("currentUser", JSON.stringify(input.user));
}

export function canAccessAdmin(user: AppUser | null): boolean {
  return Boolean(user && (user.role === "ADMIN" || user.role === "SUPERADMIN"));
}
