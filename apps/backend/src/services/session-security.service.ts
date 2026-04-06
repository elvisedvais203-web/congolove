import { prisma } from "../config/db";

export async function getSessionInvalidatedAt(userId: string): Promise<Date | null> {
  const latest = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: "ACCOUNT_SESSION_INVALIDATED"
    },
    orderBy: { createdAt: "desc" }
  });

  return latest?.createdAt ?? null;
}
