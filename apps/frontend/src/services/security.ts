import api from "../lib/api";

export async function fetchCsrfToken(): Promise<string> {
  const { data } = await api.get("/security/csrf-token");
  return data.csrfToken as string;
}
