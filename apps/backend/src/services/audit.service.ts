import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";

type AuditInput = {
  userId?: string;
  action: string;
  method: string;
  path: string;
  ipAddress?: string;
  userAgent?: string;
  statusCode: number;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      method: input.method,
      path: input.path,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      statusCode: input.statusCode,
      metadata: input.metadata
    }
  });
}
