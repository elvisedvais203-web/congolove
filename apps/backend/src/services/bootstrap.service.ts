import bcrypt from "bcryptjs";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { normalizeRdcPhone } from "../utils/phone";

async function ensureSuperAdmin(): Promise<void> {
  if (!env.superAdminEmail || !env.superAdminPhone || !env.superAdminPassword) {
    return;
  }

  const normalizedPhone = normalizeRdcPhone(env.superAdminPhone);
  const passwordHash = await bcrypt.hash(env.superAdminPassword, 12);
  const displayName = process.env.SUPERADMIN_NAME?.trim() || "Super Admin";
  const createdAt = process.env.SUPERADMIN_CREATED_AT ? new Date(process.env.SUPERADMIN_CREATED_AT) : undefined;

  const user = await prisma.user.upsert({
    where: { phone: normalizedPhone },
    update: {
      email: env.superAdminEmail,
      passwordHash,
      otpVerified: true,
      role: "SUPERADMIN",
      planTier: "PREMIUM"
    },
    create: {
      phone: normalizedPhone,
      email: env.superAdminEmail,
      passwordHash,
      otpVerified: true,
      role: "SUPERADMIN",
      planTier: "PREMIUM",
      ...(createdAt ? { createdAt } : {}),
      profile: {
        create: {
          displayName,
          bio: "Compte fondateur",
          city: "Kinshasa",
          interests: ["admin", "security", "growth"],
          verifiedBadge: true
        }
      },
      settings: {
        create: {}
      }
    }
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      displayName,
      bio: "Compte fondateur",
      city: "Kinshasa",
      interests: ["admin", "security", "growth"],
      verifiedBadge: true
    },
    create: {
      userId: user.id,
      displayName,
      bio: "Compte fondateur",
      city: "Kinshasa",
      interests: ["admin", "security", "growth"],
      verifiedBadge: true
    }
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id }
  });

  logger.info("Superadmin verifie au demarrage", {
    email: env.superAdminEmail,
    phone: normalizedPhone
  });
}

export async function ensureBootstrapData(): Promise<void> {
  try {
    await ensureSuperAdmin();
  } catch (error) {
    logger.warn("Bootstrap superadmin ignore", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}