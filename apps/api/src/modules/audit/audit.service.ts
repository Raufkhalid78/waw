import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export interface CreateAuditLogPayload {
  actorId?: string | null;
  actorRole: string;
  action: string;
  targetResourceType: string;
  targetResourceId: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress?: string;
}

export class AuditService {
  /**
   * Immutably logs an action to the audit_logs table.
   * This should never fail the main transaction if possible, but it should log errors.
   */
  static async logAction(payload: CreateAuditLogPayload): Promise<void> {
    try {
      const { error } = await supabaseAdmin.from("audit_logs").insert({
        actor_id: payload.actorId || null,
        actor_role: payload.actorRole,
        action: payload.action,
        target_resource_type: payload.targetResourceType,
        target_resource_id: payload.targetResourceId,
        previous_state: payload.previousState || null,
        new_state: payload.newState || null,
        reason: payload.reason || null,
        ip_address: payload.ipAddress || null,
      });

      if (error) {
        logger.error("[AuditService] Failed to insert audit log:", error);
      }
    } catch (err) {
      logger.error("[AuditService] Unexpected error inserting audit log:", err);
    }
  }
}