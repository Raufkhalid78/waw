import { Request, Response } from "express";
import { OrderService } from "./order.service.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { AuditService } from "../audit/audit.service.js";
import { AuthorizationService } from "../auth/authorization.service.js";
import { UserRole } from "../../types/index.js";

export class OrderController {
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const result = await OrderService.createOrder(req.body, user);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const result = await OrderService.getUserOrders(user.id, page, limit);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const order = await OrderService.getOrder(req.params.id, user.id, user.role);
      if (!order) {
        res.status(404).json({ error: "Order not found or access denied" });
        return;
      }
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createReturn(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const result = await OrderService.createReturnRequest(
        req.params.id,
        user.id,
        req.body,
      );
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getReturn(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const returnData = await OrderService.getOrderReturn(
        req.params.id,
        user.role === UserRole.ADMIN ? undefined : user.id,
      );
      if (!returnData) {
        res.status(404).json({ error: "No return request found for this order" });
        return;
      }
      res.json(returnData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, trackingNumber, courierProvider } = req.body;
      const user = (req as any).user;

      const { data: previousOrder } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", req.params.id)
        .single();

      if (!previousOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      if (user.role === "SELLER") {
        const { data: store } = await supabaseAdmin
          .from("stores")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!store) {
          res.status(403).json({ error: "Unauthorized: No active seller store found" });
          return;
        }

        const { data: storeOrder } = await supabaseAdmin
          .from("store_orders")
          .select("id")
          .eq("order_id", req.params.id)
          .eq("store_id", store.id)
          .maybeSingle();

        if (!storeOrder) {
          res.status(403).json({ error: "Forbidden: You can only update orders belonging to your store" });
          return;
        }

        await supabaseAdmin
          .from("store_orders")
          .update({ status: status, updated_at: new Date().toISOString() })
          .eq("id", storeOrder.id);
      }

      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({
          global_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      if (trackingNumber) {
        await supabaseAdmin.from("shipments").insert({
          order_id: req.params.id,
          tracking_number: trackingNumber,
          courier_name: courierProvider || "PostEx",
          status: "BOOKED",
        });
      }

      await AuditService.logAction({
        actorId: user.id || "SYSTEM",
        actorRole: user.role || "ADMIN_OR_SELLER",
        action: "ORDER_STATUS_CHANGED",
        targetResourceType: "order",
        targetResourceId: req.params.id,
        previousState: previousOrder,
        newState: data,
        reason: `Status changed to ${status}`,
      });

      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const order = await OrderService.cancelOrder(
        req.params.id,
        req.body.reason,
        user,
      );
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async createDispute(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const result = await OrderService.createDispute(
        req.params.id,
        user.id,
        req.body,
      );
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
