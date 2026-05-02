import axios from "axios";

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl;
  const socketEnv = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (socketEnv) return `${socketEnv.replace(/\/+$/, "")}/api`;
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000/api";
    }
    // Fallback when NEXT_PUBLIC_API_URL is missing in cloud deployments.
    // Use the Solola Render API service by default.
    if (hostname.endsWith(".onrender.com")) {
      return `${protocol}//solola-api.onrender.com/api`;
    }
  }
  // Production-safe default: always hit the API service directly
  // (prefer setting NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SOCKET_URL on Render).
  return "https://solola-api.onrender.com/api";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 12000
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message ?? "").toLowerCase();
      const restriction = error?.response?.data?.restriction as
        | { type?: "SUSPENDED" | "BANNED"; reason?: string; until?: string | null }
        | undefined;
      const mustLogout =
        status === 401 ||
        (status === 403 && (message.includes("banni") || message.includes("suspendu") || message.includes("session invalidee")));

      // One-shot refresh flow (retry the original request once).
      const original = error?.config as (typeof error)["config"] & { _klRetried?: boolean };
      const canTryRefresh =
        status === 401 &&
        !original?._klRetried &&
        !String(original?.url ?? "").includes("/auth/refresh") &&
        Boolean(localStorage.getItem("refreshToken"));

      if (canTryRefresh) {
        try {
          original._klRetried = true;
          if (!refreshPromise) {
            refreshPromise = (async () => {
              const refreshToken = localStorage.getItem("refreshToken");
              const resp = await api.post("/auth/refresh", { refreshToken });
              const accessToken = resp.data?.tokens?.accessToken as string | undefined;
              const nextRefresh = resp.data?.tokens?.refreshToken as string | undefined;
              const user = resp.data?.user;
              if (!accessToken || !nextRefresh || !user) {
                throw new Error("Refresh invalide");
              }
              localStorage.setItem("accessToken", accessToken);
              localStorage.setItem("refreshToken", nextRefresh);
              localStorage.setItem("currentUser", JSON.stringify(user));
              return accessToken;
            })().finally(() => {
              refreshPromise = null;
            });
          }

          const newAccess = await refreshPromise;
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api.request(original);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("currentUser");
          window.location.href = "/auth";
          return Promise.reject(error);
        }
      }

      if (mustLogout) {
        if (status === 403) {
          sessionStorage.setItem(
            "kl_account_restriction",
            JSON.stringify({
              type: restriction?.type ?? (message.includes("banni") ? "BANNED" : "SUSPENDED"),
              reason: restriction?.reason ?? error?.response?.data?.message ?? "Compte restreint",
              until: restriction?.until ?? null,
              ts: new Date().toISOString()
            })
          );
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("currentUser");

        if (status === 403 && !window.location.pathname.startsWith("/account-restricted")) {
          window.location.href = "/account-restricted";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
