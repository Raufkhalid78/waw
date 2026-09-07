import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/index.js";

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses one of the required roles.
 * SUPER_ADMIN always has access. Sub-admin roles (OPS_AGENT, FINANCE, MODERATOR)
 * must be explicitly listed — they are NOT treated as ADMIN by default.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Authentication required" });
      return;
    }

    const userRole = req.user.role;

    // SUPER_ADMIN implicitly has all admin-level access
    if (userRole === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Direct role match — only the explicitly listed roles are allowed
    if (allowedRoles.includes(userRole as UserRole)) {
      return next();
    }

    res.status(403).json({
      error: "Forbidden: Requires one of [" + allowedRoles.join(', ') + "] permissions. Current role: " + userRole,
    });
  };
}

