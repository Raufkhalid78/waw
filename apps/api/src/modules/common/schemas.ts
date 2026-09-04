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
  categoryId: z.string().min(1),
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
});

export const CreateOrderSchema = z.object({
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerPhone: z.string().min(10, "Valid phone number is required"),
  shippingAddress: z.string().min(5, "Delivery address is required"),
  shippingCity: z.string().min(2, "City is required"),
  shippingProvince: z.string().min(2, "Province is required"),
  paymentMethod: z.enum(["COD", "XPAY_CARD", "XPAY_WALLET", "RAAST_P2M_QR"], {
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

export const AdminSettingsSchema = z.record(
  z.string().min(1, "Setting key is required"),
  z.union([z.string(), z.number(), z.boolean()]),
);

export const SellerApplySchema = z.object({
  storeName: z.string().min(2, "Store name is required"),
  city: z.string().min(2, "City is required"),
  cnic: z.string().length(13, "CNIC must be exactly 13 digits").optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().length(24, "IBAN must be 24 characters").optional(),
});

export const CreateCouponSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters").max(20),
  discountType: z.enum(["PERCENTAGE", "FIXED_PKR", "FREE_SHIPPING"]),
  discountValue: z.number().positive("Discount value must be positive"),
  minOrderPkr: z.number().nonnegative().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
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
