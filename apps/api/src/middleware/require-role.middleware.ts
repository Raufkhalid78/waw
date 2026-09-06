import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/index.js";

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses the required role.
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

    // If endpoint requires ADMIN, allow any sub-admin role to access (assuming broad admin route), 
    // unless strictly locked down. For granular access, routes should specify OPS_AGENT, FINANCE etc.
    const isAdminRoute = allowedRoles.includes(UserRole.ADMIN);
    const hasSubAdminRole = [UserRole.OPS_AGENT, UserRole.FINANCE, UserRole.MODERATOR, UserRole.ADMIN].includes(userRole);

    if (allowedRoles.includes(userRole) || (isAdminRoute && hasSubAdminRole)) {
      return next();
    }

    res.status(403).json({
      error: "Forbidden: Requires one of [" + allowedRoles.join(', ') + "] permissions. Current role: " + userRole,
    });
  };
}

