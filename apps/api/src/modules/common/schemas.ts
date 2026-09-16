import { z } from "zod";

export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .min(
      10,
      "Valid Pakistani mobile number required (e.g. 03001234567 or +923001234567)",
    ),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export const CreateProductSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  titleUrdu: z.string().optional(),
  slug: z.string().min(3).optional(),
  description: z.string().min(5, "Description must be at least 5 characters"),
  pricePkr: z.number().positive().optional(),
  basePricePkr: z.number().positive().optional(),
  compareAtPricePkr: z.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  // Either the category id or its slug; slug is resolved server-side so
  // portals never need to hardcode database ids.
  categorySlug: z.string().min(2).optional(),
  images: z.array(z.string().url()).optional(),
  imageUrl: z.string().url().optional(),
  isFirstParty: z.boolean().optional(),
  storeId: z.string().optional(),
  sku: z.string().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  weightKg: z.number().positive().optional(),
  variants: z
    .array(
      z.object({
        sku: z.string().optional(),
        title: z.string().optional(),
        priceAdjustmentPkr: z.number().optional(),
        pricePkr: z.number().optional(),
        stock: z.number().int().nonnegative().optional(),
        stockQuantity: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
}).refine((d) => Boolean(d.categoryId) || Boolean(d.categorySlug), {
  message: "categoryId or categorySlug is required",
  path: ["categoryId"],
});

export const UpdateProductSchema = z.object({
  title: z.string().min(3).optional(),
  titleUrdu: z.string().optional(),
  description: z.string().min(5).optional(),
  pricePkr: z.number().positive().optional(),
  basePricePkr: z.number().positive().optional(),
  compareAtPricePkr: z.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(2).optional(),
  images: z.array(z.string().url()).optional(),
  imageUrl: z.string().url().optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  weightKg: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export const CreateOrderSchema = z.object({
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerPhone: z.string().min(10, "Valid phone number is required"),
  shippingAddress: z.string().min(5, "Delivery address is required"),
  shippingCity: z.string().min(2, "City is required"),
  // Province is derived server-side from serviceable_cities when omitted —
  // the client header city picker never captured it, so a required field
  // 400'd every logged-in checkout.
  shippingProvince: z.string().min(2, "Province is required").optional(),
  paymentMethod: z.enum(["COD", "RAAST_P2M_QR", "ALFA_WALLET", "ALFALAH_ACCOUNT", "ALFA_CARD"], {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        quantity: z.number().int().positive().max(100, "Maximum 100 items per product"),
        unitPricePkr: z.number().positive().optional(),
      }),
    )
    .min(1, "Cart must contain at least 1 item"),
});

// Guest checkout — same shape as CreateOrderSchema, but items OR quoteToken
// (quote-first flow), and no authenticated buyer fields.
export const GuestCreateOrderSchema = z
  .object({
    buyerName: z.string().min(2, "Buyer name is required"),
    buyerPhone: z.string().min(10, "Valid phone number is required"),
    shippingAddress: z.string().min(5, "Delivery address is required"),
    shippingCity: z.string().min(2, "City is required"),
    shippingProvince: z.string().min(2, "Province is required").optional(),
    paymentMethod: z.enum(["COD", "RAAST_P2M_QR", "ALFA_WALLET", "ALFALAH_ACCOUNT", "ALFA_CARD"], {
      errorMap: () => ({ message: "Invalid payment method" }),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          variantId: z.string().optional(),
          quantity: z.number().int().positive().max(100, "Maximum 100 items per product"),
        }),
      )
      .optional(),
    quoteToken: z.string().min(10).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => Boolean(d.quoteToken) || (Array.isArray(d.items) && d.items.length > 0), {
    message: "Order must contain a valid quoteToken or items list",
    path: ["items"],
  });

export const CheckoutQuoteSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        quantity: z.number().int().positive().max(100, "Maximum 100 items per product"),
      }),
    )
    .min(1, "Cart must contain at least 1 item")
    .max(50, "Maximum 50 distinct items per quote"),
  shippingCity: z.string().min(2).max(60).optional(),
  paymentMethod: z.enum(["COD", "RAAST_P2M_QR", "ALFA_WALLET", "ALFALAH_ACCOUNT", "ALFA_CARD"]).optional(),
  couponCode: z.string().min(2).max(40).optional(),
  useLoyaltyPoints: z.boolean().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED",
    "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED",
  ]),
  trackingNumber: z.string().optional(),
  courierProvider: z.enum(["POSTEX", "TRAX", "LEOPARDS", "TCS", "WAW_FLEET"]).optional(),
});

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(2000, "Comment must be under 2000 characters").optional(),
});

export const CreateDisputeSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  evidenceImages: z.array(z.string().url()).optional(),
});

// Server-side bounds for money-critical marketplace settings. These values
// drive checkout pricing for every new order — an out-of-range value (e.g.
// commission 5000 or a negative fee) corrupts all future order math, so the
// API must enforce the same gates as the admin panel, not trust it.
const SETTING_BOUNDS = {
  default_commission_pct: { min: 0, max: 50, integer: true },
  free_delivery_threshold_pkr: { min: 0, max: 100_000, integer: true },
  default_shipping_fee_pkr: { min: 0, max: 10_000, integer: true },
  cod_handling_fee_pkr: { min: 0, max: 5_000, integer: true },
  gst_rate_percentage: { min: 0, max: 25, integer: false },
  discount_tier_1_threshold: { min: 0, max: 100, integer: true },
  discount_tier_2_threshold: { min: 0, max: 100, integer: true },
  discount_tier_3_threshold: { min: 0, max: 100, integer: true },
  best_seller_days: { min: 1, max: 365, integer: true },
  best_seller_limit: { min: 1, max: 200, integer: true },
  new_arrival_days: { min: 1, max: 365, integer: true },
} as const;

type BoundedKey = keyof typeof SETTING_BOUNDS;

// Free-text settings (names, contacts, origins, social URLs) — capped length.
const TEXT_SETTING_KEYS = [
  "marketplace_name",
  "default_currency",
  "whatsapp_number",
  "support_email",
  "default_city",
  "cors_allowed_origins",
  // 034/038 seeded keys
  "currency",
  "currency_symbol",
  "business_name",
  "business_name_urdu",
  "business_tagline",
  "business_city",
  "business_country",
  "admin_url",
  "seller_url",
  "site_url",
  "site_url_www",
  "care_email",
  "support_phone",
  "facebook_url",
  "instagram_url",
  "linkedin_url",
  "twitter_url",
  "youtube_url",
  "raast_merchant_alias",
  "raast_merchant_name",
  "raast_merchant_city",
] as const;

// Whole-number settings with generous but finite bounds (days/hours/weights).
const OTHER_SETTING_KEYS = [
  "return_window_days",
  "dispatch_window_hours",
  "payout_settlement_days",
  "heavy_parcel_weight_kg",
  "express_tier1_days_min",
  "express_tier1_days_max",
  "express_other_days_min",
  "express_other_days_max",
  "standard_tier1_days_min",
  "standard_tier1_days_max",
  "standard_other_days_min",
  "standard_other_days_max",
] as const;

const ALLOWED_SETTING_KEYS: readonly string[] = [
  ...Object.keys(SETTING_BOUNDS),
  ...TEXT_SETTING_KEYS,
  ...OTHER_SETTING_KEYS,
];

export const AdminSettingsSchema = z
  .record(z.string(), z.unknown())
  .superRefine((obj, ctx) => {
    for (const [key, value] of Object.entries(obj)) {
      if (!(ALLOWED_SETTING_KEYS as readonly string[]).includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Unknown setting key "${key}"`,
        });
        continue;
      }
      if (key in SETTING_BOUNDS) {
        const parsed = z.number().safeParse(value);
        if (!parsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: "number",
            received: typeof value,
            path: [key],
            message: `${key} must be a number`,
          });
          continue;
        }
        const b = SETTING_BOUNDS[key as BoundedKey];
        const v = parsed.data;
        if (v < b.min || v > b.max || (b.integer && !Number.isInteger(v))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must be between ${b.min} and ${b.max}${b.integer ? " (whole number)" : ""}`,
          });
        }
      } else if ((TEXT_SETTING_KEYS as readonly string[]).includes(key)) {
        if (typeof value !== "string" || value.length > 500) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must be a string of at most 500 characters`,
          });
        }
      } else if ((OTHER_SETTING_KEYS as readonly string[]).includes(key)) {
        const parsed = z.number().int().min(0).max(3650).safeParse(value);
        if (!parsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must be a whole number between 0 and 3650`,
          });
        }
      }
    }
  });

// CNIC is accepted both dashed (XXXXX-XXXXXXX-X — what the /sell form sends)
// and as 13 bare digits; SellerController.formatAndValidateCnic normalizes.
const CnicSchema = z
  .string()
  .regex(/^(\d{13}|\d{5}-\d{7}-\d)$/, "CNIC must be 13 digits (format: 42101-1234567-1)");

export const SellerApplySchema = z.object({
  storeName: z.string().min(2, "Store name is required"),
  city: z.string().min(2, "City is required"),
  address: z.string().min(5, "Business address is required").optional(),
  businessAddress: z.string().min(5, "Business address is required").optional(),
  ownerName: z.string().min(2, "Owner full name is required").optional(),
  cnic: CnicSchema,
  ntn: z.string().max(20).optional(),
  ntnNumber: z.string().max(20).optional(),
  whatsappPhone: z.string().min(10, "Valid phone number is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  accountTitle: z.string().min(2, "Account title is required").optional(),
  bankTitle: z.string().min(2, "Account title is required").optional(),
  iban: z.string().regex(/^PK\d{2}[A-Z0-9]{20}$/, "IBAN must be 24 characters starting with PK").optional(),
});

export const CreateCouponSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters").max(20),
  discountType: z.enum(["PERCENTAGE", "FIXED_PKR", "FREE_SHIPPING"]),
  discountValue: z.number().positive("Discount value must be positive"),
  // The seller portal sends minSpendPkr (matching the DB column
  // min_spend_pkr); minOrderPkr is accepted as an alias for older clients.
  minSpendPkr: z.number().nonnegative().optional(),
  minOrderPkr: z.number().nonnegative().optional(),
  maxDiscountPkr: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const CreateReturnSchema = z.object({
  reason: z.string().min(3, "Return reason is required").max(200),
  comments: z.string().max(2000).optional(),
  evidenceImages: z.array(z.string().url()).max(8).optional(),
  refundPreference: z.enum(["WALLET", "ORIGINAL_PAYMENT"]).optional(),
  pickupAddress: z.string().min(5, "Pickup address is required").max(500).optional(),
  pickupCity: z.string().min(2).max(60).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1, "At least one item must be specified for return."),
});

export const CreateSupportTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  orderId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export const AddressSchema = z.object({
  label: z.string().min(1, "Address label is required"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  addressLine1: z.string().min(5, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province is required"),
  postalCode: z.string().optional(),
});

export const UserAddressSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  street_address: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province is required"),
  postal_code: z.string().optional(),
  is_default: z.boolean().optional(),
});

export const WishlistSchema = z.object({
  product_id: z.string().min(1, "Product ID is required"),
});

export const SellerKycSchema = z.object({
  cnic_number: z.string().min(13, "CNIC must be 13 digits").max(15),
  business_registration: z.string().optional(),
  bank_account_number: z.string().min(5, "Bank account is required"),
  bank_name: z.string().min(2, "Bank name is required"),
  bank_branch: z.string().optional(),
});

export const SupportMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message must be under 5000 characters"),
  attachments: z.array(z.string().url()).optional(),
});
