import crypto from "crypto";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { loginOrRegisterWithSocial } from "./auth.service";

type Provider = "google" | "apple";

type OAuthState = {
  provider: Provider;
  expiresAt: number;
};

const oauthStateStore = new Map<string, OAuthState>();
const STATE_TTL_MS = 10 * 60 * 1000;

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function cleanupStates(): void {
  const now = Date.now();
  for (const [key, value] of oauthStateStore.entries()) {
    if (value.expiresAt <= now) {
      oauthStateStore.delete(key);
    }
  }
}

function createOAuthState(provider: Provider): string {
  cleanupStates();
  const state = crypto.randomBytes(24).toString("hex");
  oauthStateStore.set(state, {
    provider,
    expiresAt: Date.now() + STATE_TTL_MS
  });
  return state;
}

function consumeOAuthState(state: string, provider: Provider): void {
  cleanupStates();
  const record = oauthStateStore.get(state);
  if (!record || record.provider !== provider || record.expiresAt <= Date.now()) {
    throw new ApiError(400, "Session OAuth invalide ou expiree.");
  }
  oauthStateStore.delete(state);
}

function buildFrontendUrl(params: Record<string, string>): string {
  const url = new URL(env.oauthFrontendSuccessUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function parseJwtPayload(token: string): Record<string, any> {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new ApiError(400, "Token social invalide.");
  }
  const raw = fromBase64Url(parts[1]);
  return JSON.parse(raw) as Record<string, any>;
}

function assertGoogleConfigured(): void {
  if (!env.oauthGoogleClientId || !env.oauthGoogleClientSecret || !env.oauthGoogleRedirectUri) {
    throw new ApiError(500, "OAuth Google non configure. Renseignez OAUTH_GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI.");
  }
}

function assertAppleConfigured(): void {
  if (
    !env.oauthAppleClientId ||
    !env.oauthAppleTeamId ||
    !env.oauthAppleKeyId ||
    !env.oauthApplePrivateKey ||
    !env.oauthAppleRedirectUri
  ) {
    throw new ApiError(500, "OAuth Apple non configure. Renseignez les variables OAUTH_APPLE_*.");
  }
}

function createAppleClientSecret(): string {
  assertAppleConfigured();

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: env.oauthAppleKeyId,
    typ: "JWT"
  };
  const payload = {
    iss: env.oauthAppleTeamId,
    iat: now,
    exp: now + 300,
    aud: "https://appleid.apple.com",
    sub: env.oauthAppleClientId
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign("SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(env.oauthApplePrivateKey, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${unsigned}.${signature}`;
}

export function getGoogleOAuthStartUrl(): string {
  assertGoogleConfigured();
  const state = createOAuthState("google");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.oauthGoogleClientId);
  url.searchParams.set("redirect_uri", env.oauthGoogleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function completeGoogleOAuth(code: string, state: string): Promise<string> {
  assertGoogleConfigured();
  if (!code || !state) {
    throw new ApiError(400, "Parametres OAuth Google invalides.");
  }
  consumeOAuthState(state, "google");

  const tokenBody = new URLSearchParams({
    code,
    client_id: env.oauthGoogleClientId,
    client_secret: env.oauthGoogleClientSecret,
    redirect_uri: env.oauthGoogleRedirectUri,
    grant_type: "authorization_code"
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString()
  });

  if (!tokenRes.ok) {
    throw new ApiError(401, "Echec de validation OAuth Google.");
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new ApiError(401, "Token Google manquant.");
  }

  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  if (!userRes.ok) {
    throw new ApiError(401, "Impossible de recuperer le profil Google.");
  }

  const userData = (await userRes.json()) as { email?: string; name?: string };
  if (!userData.email) {
    throw new ApiError(400, "Email Google introuvable.");
  }

  const result = await loginOrRegisterWithSocial({
    provider: "google",
    email: userData.email,
    displayName: userData.name
  });

  return buildFrontendUrl({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: JSON.stringify(result.user),
    provider: "google"
  });
}

export function getAppleOAuthStartUrl(): string {
  assertAppleConfigured();
  const state = createOAuthState("apple");
  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.searchParams.set("client_id", env.oauthAppleClientId);
  url.searchParams.set("redirect_uri", env.oauthAppleRedirectUri);
  url.searchParams.set("response_type", "code id_token");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("scope", "name email");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function completeAppleOAuth(input: { code?: string; idToken?: string; state?: string; user?: string }): Promise<string> {
  assertAppleConfigured();
  const code = String(input.code ?? "").trim();
  const state = String(input.state ?? "").trim();

  if (!code || !state) {
    throw new ApiError(400, "Parametres OAuth Apple invalides.");
  }
  consumeOAuthState(state, "apple");

  const clientSecret = createAppleClientSecret();
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.oauthAppleClientId,
    client_secret: clientSecret,
    redirect_uri: env.oauthAppleRedirectUri
  });

  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString()
  });

  if (!tokenRes.ok) {
    throw new ApiError(401, "Echec de validation OAuth Apple.");
  }

  const tokenData = (await tokenRes.json()) as { id_token?: string };
  const idToken = tokenData.id_token || input.idToken;
  if (!idToken) {
    throw new ApiError(401, "id_token Apple manquant.");
  }

  const payload = parseJwtPayload(idToken);
  const email = String(payload.email ?? "").trim().toLowerCase();
  if (!email) {
    throw new ApiError(400, "Email Apple introuvable.");
  }

  let displayName = "";
  if (input.user) {
    try {
      const parsed = JSON.parse(input.user) as { name?: { firstName?: string; lastName?: string } };
      displayName = `${parsed?.name?.firstName ?? ""} ${parsed?.name?.lastName ?? ""}`.trim();
    } catch {
      displayName = "";
    }
  }

  const result = await loginOrRegisterWithSocial({
    provider: "apple",
    email,
    displayName: displayName || undefined
  });

  return buildFrontendUrl({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: JSON.stringify(result.user),
    provider: "apple"
  });
}

export function buildOAuthErrorRedirect(message: string, provider: Provider): string {
  return buildFrontendUrl({ error: message, provider });
}
