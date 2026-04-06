import api from "../lib/api";
import { fetchCsrfToken } from "./security";

export async function subscribePushToken(token: string) {
  const csrf = await fetchCsrfToken();
  const { data } = await api.post("/notifications/push/subscribe", { token }, { headers: { "x-csrf-token": csrf } });
  return data;
}

export async function unsubscribePushToken(token: string) {
  const csrf = await fetchCsrfToken();
  const { data } = await api.delete("/notifications/push/subscribe", { data: { token }, headers: { "x-csrf-token": csrf } });
  return data;
}

export async function getMyPushTokens() {
  const { data } = await api.get<{ count: number; tokens: string[] }>("/notifications/push/tokens");
  return data;
}
