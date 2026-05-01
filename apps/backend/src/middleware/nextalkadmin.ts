import { Response, NextFunction } from "express";
import { AuthRequest } from "./nextalkauth";

type Role = "USER" | "ADMIN" | "SUPERADMIN";

function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  return Boolean(userRole && allowed.includes(userRole));
}

export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role as Role | undefined;
    if (!hasRole(role, allowedRoles)) {
      res.status(403).json({ message: "Acces refuse pour ce role" });
      return;
    }
    next();
  };
}

export const adminGuard = requireRoles("ADMIN", "SUPERADMIN");
export const superAdminGuard = requireRoles("SUPERADMIN");
