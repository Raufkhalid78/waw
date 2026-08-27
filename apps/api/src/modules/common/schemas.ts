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
  paymentMethod: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPricePkr: z.number().positive().optional(),
      }),
    )
    .min(1, "Cart must contain at least 1 item"),
});
