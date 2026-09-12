import { Request, Response } from "express";
import { OrderService } from "./order.service.js";
import { generateInvoicePdf } from "./invoice.service.js";
import { CartAbandonmentService } from "../cart/cart-abandonment.service.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { AuditService } from "../audit/audit.service.js";
import { AuthorizationService } from "../auth/authorization.service.js";
import { ConfigService } from "../admin/config.service.js";
import { UserRole } from "../../types/index.js";
import { logger } from "../../config/logger.js";

/**
 * Client-safe error message: intentional business-rule errors pass through
 * ("Coupon expired", "Insufficient stock"); database/provider internals
 * are masked (full detail goes to the server log).
 */
function clientError(err: any): string {
  const msg = String(err?.message || "Bad request");
  if (/\b(error|permission|schema|syntax|constraint|relation|column|row|violat|supabase|postgres|jwt|fetch|timeout|network)\b/i.test(msg) === false && msg.length < 200) {
    return msg;
  }
  logger.error("Order API error", { message: err?.message, stack: err?.stack });
  return "An internal error occurred. Please try again.";
}

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
      res.status(400).json({ error: clientError(err) });
    }
  }

  static async createGuestOrder(req: Request, res: Response): Promise<void> {
    try {
      const { buyerName, buyerPhone, shippingAddress, shippingCity, shippingProvince, paymentMethod, notes, items, quoteToken } = req.body;

      if (!buyerName || !buyerPhone || !shippingAddress || !shippingCity || !paymentMethod) {
        res.status(400).json({ error: "buyerName, buyerPhone, shippingAddress, shippingCity, and paymentMethod are required" });
        return;
      }

      if ((!items || items.length === 0) && !quoteToken) {
        res.status(400).json({ error: "Order must contain a valid quoteToken or items list" });
        return;
      }

      const result = await OrderService.createOrder({
        quoteToken,
        buyerName,
        buyerPhone,
        shippingAddress,
        shippingCity,
        shippingProvince,
        paymentMethod,
        notes,
        items,
      }, null);

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: clientError(err) });
    }
  }

  /**
   * GET /api/orders/lookup?orderNumber=WAW-XXXX&phone=+92...
   * Public guest order lookup. A guest proves ownership with the exact phone
   * the order was placed with — knowledge of the phone is the guest's
   * capability token. Returns only non-sensitive fulfillment state.
   */
  static async lookupGuestOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderNumber = String(req.query.orderNumber || "").trim();
      const phone = String(req.query.phone || "").replace(/[\s-]/g, "");

      if (!orderNumber || !phone) {
        res.status(400).json({ error: "orderNumber and phone are required" });
        return;
      }

      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, payment_status, global_status, total_amount_pkr, buyer_phone, created_at")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (error || !order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const orderPhone = String(order.buyer_phone || "").replace(/[\s-]/g, "");
      if (orderPhone !== phone) {
        // Do not leak order existence to callers without the matching phone.
        res.status(404).json({ error: "Order not found" });
        return;
      }

      res.json({
        order: {
          id: order.id,
          order_number: order.order_number,
          payment_status: order.payment_status,
          global_status: order.global_status,
          total_amount_pkr: order.total_amount_pkr,
          created_at: order.created_at,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
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
      res.status(500).json({ error: "Internal server error" });
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
      res.status(500).json({ error: "Internal server error" });
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
      res.status(400).json({ error: clientError(err) });
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
      res.status(500).json({ error: "Internal server error" });
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

        // SECURITY: sellers may only advance their own store_order. The
        // parent order's global_status is a cross-seller aggregate driven by
        // courier webhooks / admin — a seller must never write it directly.
        const { data: updatedStoreOrder, error: storeOrderErr } = await supabaseAdmin
          .from("store_orders")
          .update({ status: status, updated_at: new Date().toISOString() })
          .eq("id", storeOrder.id)
          .select()
          .single();

        if (storeOrderErr) throw storeOrderErr;

        await AuditService.logAction({
          actorId: user.id || "SYSTEM",
          actorRole: "SELLER",
          action: "STORE_ORDER_STATUS_CHANGED",
          targetResourceType: "store_order",
          targetResourceId: storeOrder.id,
          newState: updatedStoreOrder,
          reason: `Status changed to ${status}`,
        });

        res.json(updatedStoreOrder);
        return;
      }

      // Only staff (ADMIN/SUPER_ADMIN) reaches the parent-order update below.
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
          courier_provider: (courierProvider || "PostEx").toUpperCase(),
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
      res.status(400).json({ error: clientError(err) });
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
      res.status(400).json({ error: clientError(err) });
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
      res.status(400).json({ error: clientError(err) });
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

      // Guest orders (buyer_id NULL) are only accessible to whoever knows the guest's phone
      if (!order.buyer_id) {
        const phone = (req.query.phone as string || "").trim();
        if (!phone || phone !== order.buyer_phone) {
          res.status(403).json({ error: "Not authorized to download this invoice" });
          return;
        }
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
        orderNumber: order.order_number,
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
        gstPkr: order.gst_pkr || 0,
        totalPkr: order.total_amount_pkr || 0,
        gstRatePercentage: await ConfigService.getNumber("gst_rate_percentage", 18),
        supportEmail: await ConfigService.get("support_email") || "support@waw.pk",
        supportPhone: await ConfigService.get("support_phone") || "+92 300 1234567",
      };

      const pdfStream = generateInvoicePdf(invoiceData);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="waw-invoice-${invoiceData.orderNumber}.pdf"`,
      );

      pdfStream.pipe(res);
      pdfStream.on("error", (err) => {
        logger.error("PDF stream error", { message: err?.message });
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to generate invoice" });
        }
      });
    } catch (err: any) {
      logger.error("Invoice generation error", { message: err?.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
