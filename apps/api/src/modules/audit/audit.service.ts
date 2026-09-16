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

  /**
   * Paginated audit-trail listing for the admin panel. Filters narrow the
   * immutable history; ordering is newest-first.
   */
  static async listAuditLogs(opts: {
    limit?: number;
    offset?: number;
    action?: string;
    resourceType?: string;
    actorId?: string;
  }): Promise<{ logs: any[]; total: number }> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const offset = Math.max(opts.offset ?? 0, 0);

    let query = supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (opts.action) query = query.eq("action", opts.action);
    if (opts.resourceType) query = query.eq("target_resource_type", opts.resourceType);
    if (opts.actorId) query = query.eq("actor_id", opts.actorId);

    const { data, error, count } = await query;
    if (error) throw error;
    return { logs: data || [], total: count || 0 };
  }
}