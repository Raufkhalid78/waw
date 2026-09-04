import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/index.js";
import { AuthorizationService } from "../modules/auth/authorization.service.js";

/**
 * Middleware factory: requires the authenticated user to have one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!AuthorizationService.requireRole(req.user.role, allowedRoles)) {
      res.status(403).json({
        error: "Forbidden: insufficient permissions",
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }
    next();
  };
}

/**
 * Middleware: attaches order ownership check to req.
 * Call `req.authorizedOrder` after this middleware to get the verified order.
 */
export function requireOrderAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const orderId = req.params.id || req.params.orderId;
  if (!orderId) {
    res.status(400).json({ error: "Missing order ID" });
    return;
  }
  AuthorizationService.requireOrderOwnership(orderId, req.user.id, req.user.role)
    .then((order) => {
      if (!order) {
        res.status(403).json({ error: "Forbidden: you do not have access to this order" });
        return;
      }
      (req as any).authorizedOrder = order;
      next();
    })
    .catch((err) => {
      res.status(500).json({ error: "Authorization check failed" });
    });
}

/**
 * Middleware: attaches store ownership check to req.
 */
export function requireStoreAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const storeId = req.params.storeId || req.params.id;
  if (!storeId) {
    res.status(400).json({ error: "Missing store ID" });
    return;
  }
  AuthorizationService.requireStoreOwnership(storeId, req.user.id, req.user.role)
    .then((store) => {
      if (!store) {
        res.status(403).json({ error: "Forbidden: you do not have access to this store" });
        return;
      }
      (req as any).authorizedStore = store;
      next();
    })
    .catch(() => {
      res.status(500).json({ error: "Authorization check failed" });
    });
}
