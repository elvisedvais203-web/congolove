import api from "../lib/nextalkapi";

export async function fetchCsrfToken(): Promise<string> {
  const { data } = await api.get("/security/csrf-token");
  return data.csrfToken as string;
}
