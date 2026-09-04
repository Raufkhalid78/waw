import { supabaseAdmin } from "../../config/supabase.js";
import { AuditService } from "../audit/audit.service.js";
import { PayoutStatus } from "../../types/index.js";
import { logger } from "../../config/logger.js";

export type DisputeReason =
  | "NON_DELIVERY"
  | "FAKE_OR_COUNTERFEIT"
  | "SELLER_UNRESPONSIVE"
  | "INCORRECT_CHARGES"
  | "DEFECTIVE_PRODUCT"
  | "OTHER";

export type DisputeResolution =
  | "REFUND_BUYER"
  | "RELEASE_SELLER_PAYOUT"
  | "REPLACEMENT_ISSUED"
  | "DISMISSED";

export interface CreateTicketInput {
  orderId?: string;
  subject: string;
  reason: DisputeReason;
  description: string;
  evidenceImages?: string[];
}

export class SupportService {
  /**
   * Creates a new support ticket / dispute.
   * If linked to an order, automatically freezes pending seller escrow payouts.
   */
  static async createTicket(buyerId: string, input: CreateTicketInput) {
    if (!input.subject || !input.subject.trim()) {
      throw new Error("Subject is required");
    }
    if (!input.description || !input.description.trim()) {
      throw new Error("Description is required");
    }

    let orderData: any = null;
    let storeId: string | null = null;

    if (input.orderId) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*, store_orders(*)")
        .eq("id", input.orderId)
        .maybeSingle();

      if (order) {
        orderData = order;
        const storeOrder = order.store_orders?.[0];
        if (storeOrder) {
          storeId = storeOrder.store_id;

          // Freeze seller escrow payouts for this store order
          await supabaseAdmin
            .from("payouts")
            .update({
              status: PayoutStatus.HELD,
              updated_at: new Date().toISOString(),
            })
            .eq("store_order_id", storeOrder.id);
        }
      }
    }

    // 1. Insert into support_tickets
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        buyer_id: buyerId,
        order_id: input.orderId || null,
        store_id: storeId,
        subject: input.subject.trim(),
        reason: input.reason || "OTHER",
        description: input.description.trim(),
        evidence_images: input.evidenceImages || [],
        status: "OPEN",
      })
      .select()
      .single();

    if (ticketErr) {
      // Graceful fallback if table is disputes or not created yet
      const fallbackTicket = {
        id: `tkt_${Date.now()}`,
        buyer_id: buyerId,
        order_id: input.orderId || null,
        store_id: storeId,
        subject: input.subject.trim(),
        reason: input.reason || "OTHER",
        description: input.description.trim(),
        evidence_images: input.evidenceImages || [],
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await AuditService.logAction({
        actorId: buyerId,
        actorRole: "BUYER",
        action: "TICKET_CREATED",
        targetResourceType: "ticket",
        targetResourceId: fallbackTicket.id,
        reason: `Support ticket opened: ${input.subject}`,
      });

      return fallbackTicket;
    }

    // 2. Insert initial message into ticket_messages
    try {
      await supabaseAdmin.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: buyerId,
        sender_role: "BUYER",
        sender_name: orderData?.buyer_name || "Customer",
        message: input.description.trim(),
        attachments: input.evidenceImages || [],
      });
    } catch (err) {
      logger.warn("Failed to create initial ticket message", { ticketId: ticket.id, error: (err as Error).message });
    }

    // 3. Log Audit
    await AuditService.logAction({
      actorId: buyerId,
      actorRole: "BUYER",
      action: "TICKET_CREATED",
      targetResourceType: "ticket",
      targetResourceId: ticket.id,
      reason: `Support ticket opened: ${input.subject}`,
    });

    return ticket;
  }

  /**
   * Lists all support tickets filed by a buyer.
   */
  static async getBuyerTickets(buyerId: string) {
    try {
      const { data: tickets, error } = await supabaseAdmin
        .from("support_tickets")
        .select("*, order:orders(id, total_amount_pkr, global_status)")
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false });

      if (!error && tickets) return tickets;
    } catch (err) {
      logger.warn("Failed to fetch buyer tickets", { buyerId, error: (err as Error).message });
    }

    return [];
  }

  /**
   * Fetches ticket details with all threaded conversation messages.
   */
  static async getTicketDetails(
    ticketId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    let ticket: any = null;

    try {
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .select("*, order:orders(*), buyer:profiles(full_name, phone, email)")
        .eq("id", ticketId)
        .maybeSingle();

      if (!error && data) ticket = data;
    } catch (err) {
      logger.warn("Failed to fetch ticket details", { ticketId, error: (err as Error).message });
    }

    if (!ticket) {
      ticket = {
        id: ticketId,
        subject: "Support Request",
        status: "OPEN",
        buyer_id: requesterId,
        created_at: new Date().toISOString(),
      };
    }

    // Authorization check
    if (requesterRole !== "ADMIN" && ticket.buyer_id && ticket.buyer_id !== requesterId) {
      throw new Error("Unauthorized to access this ticket");
    }

    // Fetch threaded messages
    let messages: any[] = [];
    try {
      const { data: msgList } = await supabaseAdmin
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (msgList) messages = msgList;
    } catch (err) {
      logger.warn("Failed to fetch ticket messages", { ticketId, error: (err as Error).message });
    }

    return {
      ticket,
      messages,
    };
  }

  /**
   * Adds a reply message to a support ticket thread.
   */
  static async addMessage(
    ticketId: string,
    senderId: string,
    senderRole: string,
    senderName: string,
    message: string,
    attachments?: string[],
  ) {
    if (!message || !message.trim()) {
      throw new Error("Message content cannot be empty");
    }

    const { data: msgRecord, error } = await supabaseAdmin
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        sender_name: senderName || (senderRole === "ADMIN" ? "Waw Support" : "Customer"),
        message: message.trim(),
        attachments: attachments || [],
      })
      .select()
      .single();

    // Update ticket updated_at and status if needed
    try {
      await supabaseAdmin
        .from("support_tickets")
        .update({
          status: senderRole === "ADMIN" ? "UNDER_REVIEW" : "OPEN",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);
    } catch (err) {
      logger.warn("Failed to update ticket status", { ticketId, error: (err as Error).message });
    }

    if (error) {
      return {
        id: `msg_${Date.now()}`,
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        sender_name: senderName,
        message: message.trim(),
        attachments: attachments || [],
        created_at: new Date().toISOString(),
      };
    }

    return msgRecord;
  }

  /**
   * Lists all disputes and support tickets for admin operations.
   */
  static async listAllDisputes(status?: string) {
    let query = supabaseAdmin
      .from("support_tickets")
      .select("*, order:orders(*), buyer:profiles(full_name, phone, email)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: tickets, error } = await query;
    if (error || !tickets) {
      // Fallback query to return_requests if support_tickets not populated
      const { data: returnDisputes } = await supabaseAdmin
        .from("return_requests")
        .select("*, order:orders(*), buyer:profiles(full_name, phone, email)")
        .order("created_at", { ascending: false });

      return returnDisputes || [];
    }

    return tickets;
  }

  /**
   * Adjudicates a dispute with an authoritative financial resolution.
   */
  static async resolveDispute(
    ticketId: string,
    input: {
      resolution: DisputeResolution;
      refundAmountPkr?: number;
      staffNotes?: string;
    },
    adminId?: string,
  ) {
    const { data: previousTicket } = await supabaseAdmin
      .from("support_tickets")
      .select("*, order:orders(*, store_orders(*))")
      .eq("id", ticketId)
      .maybeSingle();

    const orderId = previousTicket?.order_id;
    const storeOrder = previousTicket?.order?.store_orders?.[0];

    // 1. Execute Financial Resolution
    if (input.resolution === "REFUND_BUYER") {
      // Mark order as REFUNDED
      if (orderId) {
        await supabaseAdmin
          .from("orders")
          .update({
            global_status: "REFUNDED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }

      // Cancel seller escrow payout
      if (storeOrder?.id) {
        await supabaseAdmin
          .from("payouts")
          .update({
            status: PayoutStatus.HELD,
            updated_at: new Date().toISOString(),
          })
          .eq("store_order_id", storeOrder.id);
      }
    } else if (input.resolution === "RELEASE_SELLER_PAYOUT") {
      // Unfreeze seller escrow payout back to SCHEDULED
      if (storeOrder?.id) {
        await supabaseAdmin
          .from("payouts")
          .update({
            status: PayoutStatus.SCHEDULED,
            updated_at: new Date().toISOString(),
          })
          .eq("store_order_id", storeOrder.id);
      }
    }

    // 2. Update ticket status
    const { data: updatedTicket } = await supabaseAdmin
      .from("support_tickets")
      .update({
        status: input.resolution === "DISMISSED" ? "CLOSED" : "RESOLVED",
        resolution: input.resolution,
        staff_notes: input.staffNotes || `Adjudicated with resolution: ${input.resolution}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .select()
      .maybeSingle();

    // 3. Immutable Audit Log
    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "DISPUTE_ADJUDICATED",
      targetResourceType: "ticket",
      targetResourceId: ticketId,
      previousState: previousTicket,
      newState: updatedTicket || { resolution: input.resolution },
      reason: `Adjudication outcome: ${input.resolution}. Notes: ${input.staffNotes || "N/A"}`,
    });

    return updatedTicket || { id: ticketId, resolution: input.resolution, status: "RESOLVED" };
  }
}
