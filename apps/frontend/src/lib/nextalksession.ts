export type AppRole = "USER" | "ADMIN" | "SUPERADMIN";

export type AppUser = {
  id: string;
  phone: string;
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

export function canAccessAdmin(user: AppUser | null): boolean {
  return Boolean(user && (user.role === "ADMIN" || user.role === "SUPERADMIN"));
}
