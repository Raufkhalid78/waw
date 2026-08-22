import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses the required role.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}
