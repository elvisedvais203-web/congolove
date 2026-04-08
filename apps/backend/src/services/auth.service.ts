import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { normalizeInternationalPhone } from "../utils/phone";
import { getAccountRestriction } from "./account-restriction.service";

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

export function refreshTokens(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { userId: string };
    return payload;
  } catch {
    throw new ApiError(401, "Refresh token invalide");
  }
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
