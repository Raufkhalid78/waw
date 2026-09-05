import { Request, Response } from "express";
import { OrderService } from "./order.service.js";
import { generateInvoicePdf } from "./invoice.service.js";
import { CartAbandonmentService } from "../cart/cart-abandonment.service.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { AuditService } from "../audit/audit.service.js";
import { AuthorizationService } from "../auth/authorization.service.js";
import { UserRole } from "../../types/index.js";

export class OrderController {
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const result = await OrderService.createOrder(req.body, user);
      if (user?.id) {
        CartAbandonmentService.markRecovered(user.id, result.id).catch(() => {});
      }
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async createGuestOrder(req: Request, res: Response): Promise<void> {
    try {
      const { buyerName, buyerPhone, shippingAddress, shippingCity, shippingProvince, paymentMethod, notes, items, guestToken } = req.body;

      if (!buyerName || !buyerPhone || !shippingAddress || !shippingCity) {
        res.status(400).json({ error: "buyerName, buyerPhone, shippingAddress, and shippingCity are required" });
        return;
      }

      // Create a guest user profile
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const result = await OrderService.createOrder({
        quoteToken: req.body.quoteToken,
        buyerName,
        buyerPhone,
        shippingAddress,
        shippingCity,
        shippingProvince,
        paymentMethod,
        notes,
      }, { id: guestId, role: "BUYER" });

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

  static async downloadInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("*, store_orders(*, order_items(*))")
        .eq("id", id)
        .single();

      if (error || !order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      if (order.buyer_id && order.buyer_id !== userId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const allItems: any[] = [];
      const storeOrders = order.store_orders || [];
      for (const so of storeOrders) {
        const items = so.order_items || [];
        for (const item of items) {
          allItems.push({
            productTitle: item.product_title || "Product",
            variantTitle: item.variant_title || undefined,
            quantity: item.quantity || 1,
            unitPricePkr: item.unit_price_pkr || 0,
            totalPricePkr: item.total_price_pkr || 0,
          });
        }
      }

      const invoiceData = {
        orderNumber: order.order_number || order.id,
        createdAt: order.created_at,
        buyerName: order.buyer_name || "Customer",
        buyerPhone: order.buyer_phone || "",
        shippingAddress: order.shipping_address || "",
        shippingCity: order.shipping_city || "",
        shippingProvince: order.shipping_province || "",
        paymentMethod: order.payment_method || "COD",
        items: allItems,
        subtotalPkr: order.subtotal_pkr || 0,
        shippingFeePkr: order.shipping_fee_pkr || 0,
        codFeePkr: order.cod_fee_pkr || 0,
        discountPkr: order.discount_pkr || 0,
        totalPkr: order.total_amount_pkr || 0,
      };

      const pdfStream = generateInvoicePdf(invoiceData);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="waw-invoice-${invoiceData.orderNumber}.pdf"`,
      );

      pdfStream.pipe(res);
      pdfStream.on("error", (err) => {
        console.error("PDF stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to generate invoice" });
        }
      });
    } catch (err: any) {
      console.error("Invoice generation error:", err);
      res.status(500).json({ error: err.message });
    }
  }
}
