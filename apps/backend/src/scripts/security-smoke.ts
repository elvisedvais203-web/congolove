/*
  Smoke test securite API.
  Pre-requis:
  - Backend en execution
  - DATABASE/REDIS operationnels
  - Utilisateur de test existant
*/

import "dotenv/config";

const apiUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
const phone = process.env.SMOKE_PHONE;
const password = process.env.SMOKE_PASSWORD;

if (!phone || !password) {
  throw new Error("SMOKE_PHONE et SMOKE_PASSWORD sont obligatoires.");
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  return response;
}

async function main() {
  console.log("[smoke] Health check...");
  const health = await request("/health");
  if (!health.ok) {
    throw new Error(`Health KO: ${health.status}`);
  }

  console.log("[smoke] Login...");
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password })
  });
  if (!login.ok) {
    throw new Error(`Login KO: ${login.status}`);
  }
  const loginJson = (await login.json()) as { tokens: { accessToken: string } };
  const accessToken = loginJson.tokens.accessToken;

  console.log("[smoke] Verify CSRF required on mutation...");
  const noCsrf = await request("/payments/premium", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      provider: "airtel_money",
      phone,
      amountCdf: 15000,
      purpose: "PREMIUM_SUBSCRIPTION"
    })
  });

  if (noCsrf.status !== 403) {
    throw new Error(`Expected 403 without CSRF, got ${noCsrf.status}`);
  }

  console.log("[smoke] Fetch CSRF token...");
  const csrfRes = await request("/security/csrf-token", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!csrfRes.ok) {
    throw new Error(`CSRF token endpoint KO: ${csrfRes.status}`);
  }
  const csrfJson = (await csrfRes.json()) as { csrfToken: string };

  console.log("[smoke] Verify payment mutation with CSRF...");
  const withCsrf = await request("/payments/premium", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-csrf-token": csrfJson.csrfToken
    },
    body: JSON.stringify({
      provider: "airtel_money",
      phone,
      amountCdf: 15000,
      purpose: "PREMIUM_SUBSCRIPTION"
    })
  });

  if (![200, 201].includes(withCsrf.status)) {
    throw new Error(`Payment with CSRF KO: ${withCsrf.status}`);
  }

  console.log("[smoke] OK - securite de base validee.");
}

main().catch((error) => {
  console.error("[smoke] FAILED", error);
  process.exit(1);
});
