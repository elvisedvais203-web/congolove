import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/nextalkdb";
import { env } from "../config/nextalkenv";
import { ApiError } from "../utils/nextalkapierror";
import { normalizeInternationalPhone } from "../utils/nextalkphone";
import { getAccountRestriction } from "./nextalkaccount-restriction.service";

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

export async function refreshTokens(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new ApiError(401, "Refresh token invalide");
    }

    return {
      user,
      tokens: issueTokens(user.id, user.planTier, user.role)
    };
  } catch {
    throw new ApiError(401, "Refresh token invalide");
  }
}

function normalizeEmail(raw: string) {
  return String(raw ?? "").trim().toLowerCase();
}

function requirePasswordPolicy(password: string) {
  const p = String(password ?? "");
  if (p.length < 8) {
    throw new ApiError(400, "Mot de passe trop court (minimum 8 caracteres).");
  }
  return p;
}

export async function registerWithEmailPassword(input: {
  email: string;
  password: string;
  displayName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const email = normalizeEmail(input.email);
  const password = requirePasswordPolicy(input.password);
  if (!email.includes("@")) {
    throw new ApiError(400, "Email invalide.");
  }

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    throw new ApiError(409, "Un compte existe deja avec cet email.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      otpVerified: false,
      profile: {
        create: {
          displayName: String(input.displayName ?? email.split("@")[0] ?? "Utilisateur"),
          interests: []
        }
      },
      settings: { create: {} }
    }
  });

  await prisma.loginEvent.create({
    data: {
      userId: user.id,
      identifier: email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      success: true,
      reason: "EMAIL_REGISTER"
    }
  });

  return { user, tokens: issueTokens(user.id, user.planTier, user.role) };
}

export async function loginWithEmailPassword(input: { email: string; password: string; ipAddress?: string; userAgent?: string }) {
  const email = normalizeEmail(input.email);
  const password = String(input.password ?? "");
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Identifiants invalides.");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await prisma.loginEvent.create({
      data: {
        userId: user.id,
        identifier: email,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        success: false,
        reason: "EMAIL_LOGIN_BAD_PASSWORD"
      }
    });
    throw new ApiError(401, "Identifiants invalides.");
  }

  const restriction = await getAccountRestriction(user.id);
  if (restriction.active) {
    if (restriction.type === "BANNED") {
      throw new ApiError(403, "Ce compte est banni. Contactez le support.");
    }
    throw new ApiError(
      403,
      restriction.until
        ? `Compte suspendu jusqu'au ${new Date(restriction.until).toLocaleString("fr-FR")}.`
        : "Compte suspendu temporairement."
    );
  }

  await prisma.loginEvent.create({
    data: {
      userId: user.id,
      identifier: email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      success: true,
      reason: "EMAIL_LOGIN"
    }
  });

  return { user, tokens: issueTokens(user.id, user.planTier, user.role) };
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findFirst({ where: { email } });
  // Always return ok to prevent account enumeration.
  if (!user) {
    return { ok: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt }
  });

  // In production, this token must be sent by email (SMTP/SendGrid/etc).
  // Here we only return it in non-production for operational simplicity.
  return env.nodeEnv === "production" ? { ok: true } : { ok: true, token };
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const token = String(input.token ?? "").trim();
  const newPassword = requirePasswordPolicy(input.newPassword);
  if (!token) {
    throw new ApiError(400, "Token manquant.");
  }

  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new ApiError(400, "Token invalide ou expire.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash }
  });
  await prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });

  return { user, tokens: issueTokens(user.id, user.planTier, user.role) };
}

export async function loginOrRegisterWithFirebasePhone(input: {
  firebaseUid: string;
  phoneNumber: string;
  displayName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const firebaseUid = String(input.firebaseUid ?? "").trim();
  const phone = normalizeInternationalPhone(String(input.phoneNumber ?? "").trim());

  if (!firebaseUid || !phone) {
    throw new ApiError(400, "Informations Firebase invalides.");
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ firebaseUid }, { phone }]
    }
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
    user = await prisma.user.create({
      data: {
        firebaseUid,
        phone,
        passwordHash,
        otpVerified: true,
        profile: {
          create: {
            displayName: String(input.displayName ?? `User ${phone.slice(-4)}`),
            interests: []
          }
        },
        settings: {
          create: {}
        }
      }
    });
  } else if (!user.firebaseUid || user.firebaseUid !== firebaseUid) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        firebaseUid,
        otpVerified: true,
        phone
      }
    });
  }

  const restriction = await getAccountRestriction(user.id);
  if (restriction.active) {
    if (restriction.type === "BANNED") {
      throw new ApiError(403, "Ce compte est banni. Contactez le support.");
    }
    throw new ApiError(
      403,
      restriction.until
        ? `Compte suspendu jusqu'au ${new Date(restriction.until).toLocaleString("fr-FR")}.`
        : "Compte suspendu temporairement."
    );
  }

  await prisma.loginEvent.create({
    data: {
      userId: user.id,
      identifier: phone,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      success: true,
      reason: "FIREBASE_PHONE_LOGIN"
    }
  });

  return {
    user,
    tokens: issueTokens(user.id, user.planTier, user.role)
  };
}

export async function bootstrapSuperAdmin() {
  const email = env.superAdminEmail?.trim();
  const phone = env.superAdminPhone?.trim();
  const password = env.superAdminPassword?.trim();

  if (!email || !phone || !password) {
    console.log("[bootstrap] Super admin variables not set, skipping bootstrap");
    return;
  }

  console.log("[bootstrap] Checking super admin account...");

  // Check if super admin already exists
  const existing = await prisma.user.findFirst({
    where: { phone: phone }
  });

  if (existing) {
    if (existing.role === "SUPERADMIN") {
      console.log("[bootstrap] Super admin already exists, updating password...");
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          email: email,
          passwordHash: passwordHash,
          role: "SUPERADMIN",
          planTier: "PREMIUM",
          otpVerified: true
        }
      });
      console.log("[bootstrap] Super admin updated successfully");
    } else {
      console.log("[bootstrap] User exists but not super admin, skipping");
    }
    return;
  }

  // Create super admin
  console.log("[bootstrap] Creating super admin account...");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email,
      phone: phone,
      passwordHash: passwordHash,
      otpVerified: true,
      planTier: "PREMIUM",
      role: "SUPERADMIN",
      profile: {
        create: {
          displayName: "Super Admin",
          bio: "Compte administrateur système",
          city: "Kinshasa",
          interests: ["admin", "security", "system"],
          verifiedBadge: true
        }
      },
      settings: { create: {} }
    }
  });

  console.log(`[bootstrap] Super admin created successfully: ${email} (${phone})`);
  return user;
}
