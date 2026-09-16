import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { AuditService } from "../audit/audit.service.js";
import { ConfigService } from "../admin/config.service.js";
import { UserRole } from "../../types/index.js";
import { decideCourierStatusEvent } from "../logistics/courier.service.js";
import { OrderStatus } from "../../types/index.js";

function formatAndValidateCnic(rawCnic?: string): string {
  if (!rawCnic) throw new Error("Pakistani CNIC is required");
  const cleaned = rawCnic.replace(/\D/g, "");
  if (cleaned.length !== 13) {
    throw new Error("Invalid Pakistani CNIC: Must be exactly 13 digits (format: XXXXX-XXXXXXX-X)");
  }
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
}

function validateIbanOrAccount(rawIban?: string): string {
  if (!rawIban) throw new Error("Bank Account Number or IBAN is required");
  const cleaned = rawIban.replace(/[\s-]/g, "").toUpperCase();
  if (cleaned.startsWith("PK")) {
    if (cleaned.length !== 24) {
      throw new Error("Invalid Pakistani IBAN: Must be 24 characters starting with PK");
    }
    return cleaned;
  }
  if (cleaned.length < 8 || cleaned.length > 24) {
    throw new Error("Invalid Bank Account Number: Must be between 8 and 24 characters");
  }
  return cleaned;
}

function maskCnic(cnic?: string): string {
  if (!cnic || cnic.length < 5) return cnic || "";
  const clean = cnic.replace(/\D/g, "");
  if (clean.length === 13) {
    return `${clean.slice(0, 5)}-*******-${clean.slice(12)}`;
  }
  return `${cnic.slice(0, 5)}-*******-${cnic.slice(-1)}`;
}

function maskAccount(acc?: string): string {
  if (!acc || acc.length < 8) return acc || "";
  return `${acc.slice(0, 4)}****${acc.slice(-4)}`;
}

export class SellerController {
  static async apply(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      const { data: existingStore } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existingStore) {
        res.status(400).json({ error: "A store application already exists for your account." });
        return;
      }

      const { storeName, city, address, businessAddress, cnic, bankTitle, accountTitle, bankAccount, iban, bankName, ntnNumber } = req.body;

      if (!storeName || storeName.trim().length < 3) {
        res.status(400).json({ error: "Store name must be at least 3 characters" });
        return;
      }

      const validCnic = formatAndValidateCnic(cnic);
      const validAccount = validateIbanOrAccount(iban || bankAccount);
      const resolvedAccountTitle = accountTitle || bankTitle || storeName;
      const defaultCity = await ConfigService.get("default_city") || "Lahore";
      const resolvedAddress = address || businessAddress || `${defaultCity}, Pakistan`;

      const baseSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

      const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .insert({
          owner_id: user.id,
          name: storeName.trim(),
          slug,
          city: city || defaultCity,
          address: resolvedAddress,
          cnic: validCnic,
          cnic_number: validCnic,
          account_title: resolvedAccountTitle,
          bank_account_title: resolvedAccountTitle,
          account_number: validAccount,
          bank_account_number: validAccount,
          bank_name: bankName || "Standard Chartered / HBL",
          ntn_number: ntnNumber || null,
          status: "PENDING_KYC",
          is_verified: false,
        })
        .select()
        .single();

      if (storeError) throw storeError;

      await supabaseAdmin
        .from("profiles")
        .update({ role: "SELLER" })
        .eq("id", user.id);

      await AuditService.logAction({
        actorId: user.id,
        actorRole: "SELLER",
        action: "SELLER_APPLIED",
        targetResourceType: "store",
        targetResourceId: store.id,
        reason: "New merchant onboarding application submitted",
      });

      res.status(201).json({
        success: true,
        message: "Store application submitted successfully for KYC review",
        store: {
          ...store,
          cnic: maskCnic(store.cnic),
          cnic_number: maskCnic(store.cnic_number),
          account_number: maskAccount(store.account_number),
          bank_account_number: maskAccount(store.bank_account_number),
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateKyc(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!store) {
        res.status(404).json({ error: "Store not found for this seller" });
        return;
      }

      // Accept BOTH the documented API field names (cnic, iban, accountTitle,
      // bankTitle, bankAccount, bankName, branchCity) AND the seller
      // portal's names (cnic_number, bank_account_number, bank_name,
      // account_title, bank_iban). Previously the portal's names were
      // silently dropped and KYC submission always failed with
      // "Pakistani CNIC is required".
      const {
        // canonical
        cnic, accountTitle, bankTitle, bankAccount, iban, bankName, branchCity, ntnNumber, address,
        // seller-portal aliases
        cnic_number, account_title, bank_account_number, bank_iban, bank_name, branch_city, ntn_number,
      } = req.body;

      const validCnic = formatAndValidateCnic(
        cnic || cnic_number || store.cnic || store.cnic_number,
      );
      const validAccount = validateIbanOrAccount(
        iban || bank_iban || bankAccount || bank_account_number ||
        store.account_number || store.bank_account_number,
      );
      const resolvedTitle =
        accountTitle || account_title || bankTitle || store.account_title || store.name;
      const resolvedBankName =
        bankName || bank_name || store.bank_name || "Bank";
      const resolvedBranchCity = branchCity || branch_city || store.city;
      const resolvedNtn = ntnNumber || ntn_number || store.ntn_number;
      const resolvedAddress = address || store.address;

      const { data: updatedStore, error: updateError } = await supabaseAdmin
        .from("stores")
        .update({
          cnic: validCnic,
          cnic_number: validCnic,
          account_title: resolvedTitle,
          bank_account_title: resolvedTitle,
          account_number: validAccount,
          bank_account_number: validAccount,
          bank_name: resolvedBankName,
          city: resolvedBranchCity,
          address: resolvedAddress,
          ntn_number: resolvedNtn,
          status: store.status === "ACTIVE" ? "ACTIVE" : "PENDING_KYC",
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await AuditService.logAction({
        actorId: user.id,
        actorRole: "SELLER",
        action: "KYC_DETAILS_UPDATED",
        targetResourceType: "store",
        targetResourceId: store.id,
        reason: "Seller submitted updated KYC credentials and banking details",
      });

      res.json({
        success: true,
        message: "KYC details updated successfully",
        store: {
          ...updatedStore,
          cnic: maskCnic(updatedStore.cnic),
          cnic_number: maskCnic(updatedStore.cnic_number),
          account_number: maskAccount(updatedStore.account_number),
          bank_account_number: maskAccount(updatedStore.bank_account_number),
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getKycStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, name, slug, status, is_verified, cnic, cnic_number, account_title, bank_account_title, account_number, bank_account_number, bank_name, city, address, created_at, updated_at")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!store) {
        res.status(404).json({ error: "No store associated with this account" });
        return;
      }

      res.json({
        storeId: store.id,
        storeName: store.name,
        status: store.status,
        isVerified: Boolean(store.is_verified),
        cnicMasked: maskCnic(store.cnic || store.cnic_number),
        accountTitle: store.account_title || store.bank_account_title,
        accountMasked: maskAccount(store.account_number || store.bank_account_number),
        bankName: store.bank_name,
        city: store.city,
        address: store.address,
        submittedAt: store.created_at,
        lastUpdatedAt: store.updated_at,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getStore(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!store) {
        res.json({ message: "No store found for this seller" });
        return;
      }

      res.json({
        ...store,
        cnic: maskCnic(store.cnic || store.cnic_number),
        cnic_number: maskCnic(store.cnic || store.cnic_number),
        account_number: maskAccount(store.account_number || store.bank_account_number),
        bank_account_number: maskAccount(store.account_number || store.bank_account_number),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * PATCH /api/seller/store — seller self-service profile updates.
   * Only presentation fields are editable; status/is_verified/commission
   * are marketplace-controlled (guard trigger in migration 049) and KYC
   * financials go through the dedicated /api/seller/kyc flow.
   */
  static async updateStore(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { name, description, logoUrl, bannerUrl, city, address } = req.body;

      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.status(404).json({ error: "No store found for this seller" });
        return;
      }

      const update: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name && typeof name === "string") update.name = name.trim();
      if (description !== undefined) update.description = description;
      if (logoUrl !== undefined) update.logo_url = logoUrl;
      if (bannerUrl !== undefined) update.banner_url = bannerUrl;
      if (city && typeof city === "string") update.city = city.trim();
      if (address !== undefined) update.address = address;

      const { data: updated, error } = await supabaseAdmin
        .from("stores")
        .update(update)
        .eq("id", store.id)
        .select("id, name, slug, description, logo_url, banner_url, city, address, status, is_verified, rating_average, rating_count")
        .single();

      if (error) throw error;
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * PATCH /api/seller/orders/:storeOrderId/status — seller fulfillment
   * transition on their own store_order. Takes the STORE ORDER id (what
   * the seller portal lists in /api/seller/orders), validates ownership,
   * and never touches the parent order's cross-seller global_status.
   */
  static async updateStoreOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { status } = req.body;
      const { storeOrderId } = req.params;

      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.status(403).json({ error: "No active seller store found" });
        return;
      }

      const { data: storeOrder } = await supabaseAdmin
        .from("store_orders")
        .select("id, status, store_id")
        .eq("id", storeOrderId)
        .maybeSingle();
      if (!storeOrder) {
        res.status(404).json({ error: "Store order not found" });
        return;
      }
      if (storeOrder.store_id !== store.id) {
        res.status(403).json({ error: "You can only update orders belonging to your store" });
        return;
      }

      // Enforce monotonic lifecycle (same rank rule as courier webhooks):
      // blocks CONFIRMED -> DELIVERED jumps (early escrow maturity) and
      // backward transitions like DELIVERED -> CANCELLED.
      const decision = decideCourierStatusEvent(
        storeOrder.status as OrderStatus,
        status as OrderStatus,
      );
      if (decision.action === "reject-regression") {
        res.status(400).json({
          error: `Invalid status transition: order is ${storeOrder.status} and cannot move to ${status}. Status may only advance forward through the fulfillment lifecycle.`,
        });
        return;
      }

      const { data: updated, error } = await supabaseAdmin
        .from("store_orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", storeOrderId)
        .select()
        .single();
      if (error) throw error;

      await AuditService.logAction({
        actorId: user.id || "SYSTEM",
        actorRole: "SELLER",
        action: "STORE_ORDER_STATUS_CHANGED",
        targetResourceType: "store_order",
        targetResourceId: storeOrderId,
        previousState: { status: storeOrder.status },
        newState: updated,
        reason: `Status changed to ${status} via seller portal`,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listOrders(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json([]);
        return;
      }

      const { data: storeOrders, error } = await supabaseAdmin
        .from("store_orders")
        .select("*, order_items(*), shipments(*), orders!inner(buyer_name, buyer_phone, shipping_city)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(storeOrders || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listProducts(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!store) {
        res.json([]);
        return;
      }

      const { data: products, error } = await supabaseAdmin
        .from("seller_offers")
        .select("*, catalog_product:catalog_products(*, category:categories(name, slug)), variants:offer_variants(*)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(products || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json({
          totalRevenuePkr: 0,
          pendingPayoutsPkr: 0,
          totalOrders: 0,
          activeProducts: 0,
          storeStatus: "NOT_FOUND",
        });
        return;
      }

      const [storeOrdersResult, payoutsResult, activeProductsResult] = await Promise.all([
        supabaseAdmin
          .from("store_orders")
          .select("subtotal_pkr, status")
          .eq("store_id", store.id),
        supabaseAdmin
          .from("payouts")
          .select("amount_pkr")
          .eq("store_id", store.id)
          .eq("status", "SCHEDULED"),
        supabaseAdmin
          .from("seller_offers")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .eq("status", "ACTIVE"),
      ]);

      const validOrders = (storeOrdersResult.data || []).filter(
        (o: any) => o.status !== "CANCELLED",
      );
      const totalRevenuePkr = validOrders.reduce(
        (sum: number, o: any) => sum + (o.subtotal_pkr || 0),
        0,
      );

      const pendingPayoutsPkr = (payoutsResult.data || []).reduce(
        (sum: number, p: any) => sum + (p.amount_pkr || 0),
        0,
      );

      res.json({
        totalRevenuePkr,
        pendingPayoutsPkr,
        totalOrders: (storeOrdersResult.data || []).length,
        activeProducts: activeProductsResult.count || 0,
        storeStatus: store.status,
        storeName: store.name,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listPayouts(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json([]);
        return;
      }

      const { data: payouts } = await supabaseAdmin
        .from("payouts")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      res.json(payouts || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.status(403).json({ error: "No store found" });
        return;
      }

      const {
        code,
        discountType,
        discountValue,
        minSpendPkr,
        minOrderPkr,
        maxDiscountPkr,
        expiresAt,
        maxUses,
      } = req.body;
      // minSpendPkr (portal contract) takes precedence; minOrderPkr is the
      // legacy alias. Both were previously stripped by Zod → coupons saved
      // with min_spend_pkr = 0 and no cap.
      const minSpend = minSpendPkr ?? minOrderPkr ?? 0;
      const { data: coupon, error } = await supabaseAdmin
        .from("coupons")
        .insert({
          code: code.toUpperCase(),
          store_id: store.id,
          discount_type: discountType || "PERCENTAGE",
          discount_value: discountValue,
          min_spend_pkr: minSpend,
          max_discount_pkr: maxDiscountPkr || null,
          expires_at: expiresAt || null,
          max_uses: maxUses || null,
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json(coupon);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/seller/coupons — the seller portal's coupons list. The create
   * route existed but the list route was never registered, so the portal's
   * coupon grid always 404'd and stayed empty.
   */
  static async listCoupons(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json([]);
        return;
      }

      const { data: coupons, error } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(coupons || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/seller/inventory/adjust — records a restock or damage
   * adjustment in the double-entry inventory ledger, scoped to the
   * caller's store.
   *
   * Ownership chain enforced server-side: the offer (and its first variant)
   * must belong to the authenticated seller's store. The client only supplies
   * its own product id — cross-seller adjustments are rejected with 403.
   */
  static async adjustInventory(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { product_id: productId, adjustment_type: adjustmentType, quantity, reason } = req.body;

      const qty = Math.trunc(Number(quantity));
      if (!Number.isFinite(qty) || qty === 0) {
        res.status(400).json({ error: "A non-zero adjustment quantity is required" });
        return;
      }
      if (!["restock", "damage"].includes(adjustmentType)) {
        res.status(400).json({ error: "adjustment_type must be 'restock' or 'damage'" });
        return;
      }
      if (adjustmentType === "damage" && qty > 0) {
        res.status(400).json({ error: "Damage adjustments must carry a negative quantity" });
        return;
      }

      // Resolve the caller's store
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.status(404).json({ error: "No store found for this seller" });
        return;
      }

      // Ownership: offer must belong to this store, and we need a variant
      const { data: offer } = await supabaseAdmin
        .from("seller_offers")
        .select("id, store_id")
        .eq("id", productId)
        .maybeSingle();

      if (!offer || offer.store_id !== store.id) {
        res.status(403).json({ error: "You can only adjust inventory for your own products" });
        return;
      }

      const { data: variant } = await supabaseAdmin
        .from("offer_variants")
        .select("id")
        .eq("offer_id", offer.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!variant) {
        res.status(400).json({ error: "Product has no inventory variant to adjust" });
        return;
      }

      const { InventoryService } = await import("../products/inventory.service.js");
      if (adjustmentType === "restock") {
        await InventoryService.recordRestock({
          storeId: store.id,
          offerVariantId: variant.id,
          quantity: Math.abs(qty),
          notes: reason || "Restock via seller portal",
          actorId: user.id,
        });
      } else {
        // Refuse damage adjustments that would take stock below zero
        const available = await InventoryService.getAvailableStock(variant.id);
        if (available + qty < 0) {
          res.status(400).json({
            error: `Adjustment exceeds available stock (${available} in hand)`,
          });
          return;
        }
        await InventoryService.recordDamageAdjustment({
          storeId: store.id,
          offerVariantId: variant.id,
          quantity: Math.abs(qty),
          notes: reason || "Damage adjustment via seller portal",
          actorId: user.id,
        });
      }

      const { AuditService } = await import("../audit/audit.service.js");
      await AuditService.logAction({
        actorId: user.id,
        actorRole: "SELLER",
        action: "INVENTORY_ADJUSTED_PORTAL",
        targetResourceType: "offer",
        targetResourceId: productId,
        reason: `${adjustmentType === "restock" ? "+" : ""}${qty} via seller portal. ${reason || ""}`.trim(),
      });

      res.json({ success: true, adjustedQuantity: qty });
    } catch (err: any) {
      logger.error("Seller inventory adjustment failed", { message: err.message });
      res.status(500).json({ error: "Failed to adjust inventory" });
    }
  }

  /**
   * GET /api/seller/feedback — reviews on this seller's products awaiting a
   * reply, plus unanswered product questions. Scoped to the caller's store.
   */
  static async listFeedback(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json({ reviews: [], questions: [] });
        return;
      }

      // This store's catalog product ids
      const { data: offers } = await supabaseAdmin
        .from("seller_offers")
        .select("catalog_product_id")
        .eq("store_id", store.id);
      const productIds = (offers || []).map((o: any) => o.catalog_product_id).filter(Boolean);
      if (productIds.length === 0) {
        res.json({ reviews: [], questions: [] });
        return;
      }

      // Approved reviews on those products that have no seller reply yet
      const { data: reviewRows, error: reviewsErr } = await supabaseAdmin
        .from("reviews")
        .select("id, rating, comment, created_at, product:catalog_products(id, title, slug)")
        .in("product_id", productIds)
        .eq("status", "APPROVED")
        .is("seller_reply", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (reviewsErr) throw reviewsErr;

      const storeReviews = (reviewRows || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        productTitle: r.product?.title,
        productSlug: r.product?.slug,
        createdAt: r.created_at,
      }));

      // Unanswered questions on those products
      const { data: questionRows, error: questionsErr } = await supabaseAdmin
        .from("product_questions")
        .select("id, question, created_at, product:catalog_products(id, title, slug)")
        .in("product_id", productIds)
        .is("answer", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (questionsErr) throw questionsErr;

      const storeQuestions = (questionRows || []).map((q: any) => ({
        id: q.id,
        question: q.question,
        productTitle: q.product?.title,
        productSlug: q.product?.slug,
        createdAt: q.created_at,
      }));

      res.json({ reviews: storeReviews, questions: storeQuestions });
    } catch (err: any) {
      logger.error("Seller feedback fetch failed", { message: err.message });
      res.status(500).json({ error: "Failed to load feedback" });
    }
  }
}
