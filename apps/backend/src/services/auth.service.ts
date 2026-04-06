import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { normalizeInternationalPhone } from "../utils/phone";
import { getAccountRestriction } from "./account-restriction.service";

interface RegisterInput {
  email?: string;
  phone?: string;
  password: string;
}

interface LoginInput {
  phone?: string;
  email?: string;
  identifier?: string;
  password: string;
}

interface ConfirmIdentityInput {
  phone?: string;
  email?: string;
  identifier?: string;
}

function resolveLoginIdentifier(input: { phone?: string; email?: string; identifier?: string }): { type: "phone" | "email"; value: string } {
  const rawIdentifier = String(input.identifier ?? input.email ?? input.phone ?? "").trim();
  if (!rawIdentifier) {
    throw new ApiError(400, "Email ou numero requis");
  }

  if (rawIdentifier.includes("@")) {
    return { type: "email", value: rawIdentifier.toLowerCase() };
  }

  return { type: "phone", value: normalizeInternationalPhone(rawIdentifier) };
}

function issueTokens(userId: string, planTier: "FREE" | "PREMIUM", role: "USER" | "ADMIN" | "SUPERADMIN") {
  const accessExpiresIn = env.jwtAccessTtl as jwt.SignOptions["expiresIn"];
  const refreshExpiresIn = env.jwtRefreshTtl as jwt.SignOptions["expiresIn"];

  const accessToken = jwt.sign({ userId, planTier, role }, env.jwtAccessSecret, {
    expiresIn: accessExpiresIn
  });

  const refreshToken = jwt.sign({ userId }, env.jwtRefreshSecret, {
    expiresIn: refreshExpiresIn
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput) {
  const phone = normalizeInternationalPhone(String(input.phone ?? ""));
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new ApiError(409, "Numero deja utilise");
  }

  const normalizedEmail = input.email?.trim().toLowerCase();
  if (normalizedEmail) {
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) {
      throw new ApiError(409, "Email deja utilise");
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      phone,
      passwordHash,
      otpVerified: false,
      profile: {
        create: {
          displayName: `User ${phone.slice(-4)}`,
          interests: []
        }
      }
    }
  });

  return {
    user
  };
}

export async function loginOrRegisterWithSocial(input: { provider?: "google" | "apple"; email?: string; displayName?: string }) {
  const provider = String(input.provider ?? "").toLowerCase();
  if (provider !== "google" && provider !== "apple") {
    throw new ApiError(400, "Provider social invalide");
  }

  const normalizedEmail = String(input.email ?? "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new ApiError(400, "Email valide requis pour la connexion sociale.");
  }

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    const randomSuffix = Date.now().toString().slice(-8);
    const pseudoPhone = `+999${randomSuffix}`;
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: pseudoPhone,
        passwordHash,
        otpVerified: true,
        profile: {
          create: {
            displayName: String(input.displayName ?? normalizedEmail.split("@")[0]).slice(0, 60) || `${provider}-user`,
            interests: []
          }
        }
      }
    });
  }

  const restriction = await getAccountRestriction(user.id);
  if (restriction.active) {
    if (restriction.type === "BANNED") {
      throw new ApiError(403, "Ce compte est banni. Contactez le support.");
    }
    throw new ApiError(403, restriction.until ? `Compte suspendu jusqu'au ${new Date(restriction.until).toLocaleString("fr-FR")}.` : "Compte suspendu temporairement.");
  }

  return {
    user,
    tokens: issueTokens(user.id, user.planTier, user.role)
  };
}

export async function loginUser(input: LoginInput) {
  const identifier = resolveLoginIdentifier(input);
  const user =
    identifier.type === "email"
      ? await prisma.user.findUnique({ where: { email: identifier.value } })
      : await prisma.user.findUnique({ where: { phone: identifier.value } });
  if (!user) {
    throw new ApiError(401, "Identifiants invalides");
  }

  const restriction = await getAccountRestriction(user.id);
  if (restriction.active) {
    if (restriction.type === "BANNED") {
      throw new ApiError(403, "Ce compte est banni. Contactez le support.");
    }
    throw new ApiError(403, restriction.until ? `Compte suspendu jusqu'au ${new Date(restriction.until).toLocaleString("fr-FR")}.` : "Compte suspendu temporairement.");
  }

  if (!user.otpVerified) {
    throw new ApiError(403, "Identite non confirmee. Verifiez le code OTP avant de vous connecter.");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, "Identifiants invalides");
  }

  return {
    user,
    tokens: issueTokens(user.id, user.planTier, user.role)
  };
}

export async function confirmUserIdentity(input: ConfirmIdentityInput) {
  const identifier = resolveLoginIdentifier(input);
  const user =
    identifier.type === "email"
      ? await prisma.user.findUnique({ where: { email: identifier.value } })
      : await prisma.user.findUnique({ where: { phone: identifier.value } });

  if (!user) {
    throw new ApiError(404, "Compte introuvable");
  }

  if (user.otpVerified) {
    return { alreadyVerified: true };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { otpVerified: true }
  });

  return { alreadyVerified: false };
}

export function refreshTokens(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { userId: string };
    return payload;
  } catch {
    throw new ApiError(401, "Refresh token invalide");
  }
}

export async function resetPassword(input: { identifier: string; newPassword: string }) {
  const id = resolveLoginIdentifier(input);
  const user =
    id.type === "email"
      ? await prisma.user.findUnique({ where: { email: id.value } })
      : await prisma.user.findUnique({ where: { phone: id.value } });

  if (!user) {
    throw new ApiError(404, "Compte introuvable");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}
