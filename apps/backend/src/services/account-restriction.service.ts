import { prisma } from "../config/db";

export type RestrictionType = "SUSPENDED" | "BANNED";

export type AccountRestriction = {
  active: boolean;
  type?: RestrictionType;
  reason?: string;
  until?: string | null;
  note?: string;
};

type RestrictionMetadata = {
  status?: "ACTIVE" | "LIFTED";
  type?: RestrictionType;
  reason?: string;
  note?: string;
  until?: string | null;
};

export async function getAccountRestriction(userId: string): Promise<AccountRestriction> {
  const latest = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: "ACCOUNT_RESTRICTION_UPDATED"
    },
    orderBy: { createdAt: "desc" }
  });

  if (!latest) {
    return { active: false };
  }

  const metadata = (latest.metadata ?? {}) as RestrictionMetadata;
  if (metadata.status !== "ACTIVE") {
    return { active: false };
  }

  const until = metadata.until ?? null;
  if (until && Number.isFinite(Date.parse(until)) && Date.parse(until) <= Date.now()) {
    return { active: false };
  }

  if (!metadata.type) {
    return { active: false };
  }

  return {
    active: true,
    type: metadata.type,
    reason: metadata.reason ?? "Restriction active",
    until,
    note: metadata.note
  };
}
