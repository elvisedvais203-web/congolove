import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 12000
});

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
  (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message ?? "").toLowerCase();
      const restriction = error?.response?.data?.restriction as
        | { type?: "SUSPENDED" | "BANNED"; reason?: string; until?: string | null }
        | undefined;
      const mustLogout =
        status === 401 ||
        (status === 403 && (message.includes("banni") || message.includes("suspendu") || message.includes("session invalidee")));

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
