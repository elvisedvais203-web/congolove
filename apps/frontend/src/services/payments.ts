import api from "../lib/api";

export async function buyPremium(provider: string, phone: string, amountCdf: number) {
  const { data } = await api.post("/payments/premium", {
    provider,
    phone,
    amountCdf,
    purpose: "PREMIUM_SUBSCRIPTION"
  });
  return data;
}
