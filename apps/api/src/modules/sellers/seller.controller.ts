import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { AuditService } from "../audit/audit.service.js";
import { UserRole } from "../../types/index.js";

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
      const resolvedAddress = address || businessAddress || "Lahore, Pakistan";

      const baseSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

      const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .insert({
          owner_id: user.id,
          name: storeName.trim(),
          slug,
          city: city || "Lahore",
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

      const { cnic, accountTitle, bankTitle, bankAccount, iban, bankName, branchCity, ntnNumber, address } = req.body;

      const validCnic = formatAndValidateCnic(cnic || store.cnic || store.cnic_number);
      const validAccount = validateIbanOrAccount(iban || bankAccount || store.account_number || store.bank_account_number);
      const resolvedTitle = accountTitle || bankTitle || store.account_title || store.name;
      const resolvedBankName = bankName || store.bank_name || "Bank";

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
          city: branchCity || store.city,
          address: address || store.address,
          ntn_number: ntnNumber || store.ntn_number,
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
        maxDiscountPkr,
        expiresAt,
        maxUses,
      } = req.body;
      const { data: coupon, error } = await supabaseAdmin
        .from("coupons")
        .insert({
          code: code.toUpperCase(),
          store_id: store.id,
          discount_type: discountType || "PERCENTAGE",
          discount_value: discountValue,
          min_spend_pkr: minSpendPkr || 0,
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
}
