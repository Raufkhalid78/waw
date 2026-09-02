import { supabaseAdmin } from "../../config/supabase.js";

export class CartService {
  /**
   * Get or create a guest cart by anonymous token
   */
  static async getOrCreateGuestCart(guestToken: string) {
    const { data: existing } = await supabaseAdmin
      .from("carts")
      .select("id, guest_token, user_id")
      .eq("guest_token", guestToken)
      .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await supabaseAdmin
      .from("carts")
      .insert({ guest_token: guestToken })
      .select("id, guest_token, user_id")
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Get cart items with product details
   */
  static async getCartItems(cartId: string) {
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .select(`
        id,
        product_id,
        variant_id,
        quantity,
        products (
          id,
          title,
          slug,
          base_price_pkr,
          images,
          is_first_party,
          store_id,
          stores (
            id,
            name,
            slug
          )
        )
      `)
      .eq("cart_id", cartId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Add item to cart (upsert quantity)
   */
  static async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string
  ) {
    // Check if item already exists
    const { data: existing } = await supabaseAdmin
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", productId)
      .eq("variant_id", variantId || null)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("cart_items")
        .insert({
          cart_id: cartId,
          product_id: productId,
          variant_id: variantId || null,
          quantity,
        });
      if (error) throw error;
    }

    return { success: true };
  }

  /**
   * Update item quantity
   */
  static async updateQuantity(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string
  ) {
    if (quantity <= 0) {
      return this.removeItem(cartId, productId, variantId);
    }

    const { error } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity })
      .eq("cart_id", cartId)
      .eq("product_id", productId)
      .eq("variant_id", variantId || null);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Remove item from cart
   */
  static async removeItem(
    cartId: string,
    productId: string,
    variantId?: string
  ) {
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId)
      .eq("product_id", productId)
      .eq("variant_id", variantId || null);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Clear entire cart
   */
  static async clearCart(cartId: string) {
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Merge guest cart into user cart after login
   */
  static async mergeGuestCartToUser(guestToken: string, userId: string) {
    // Get or create user cart
    let { data: userCart } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!userCart) {
      const { data: created } = await supabaseAdmin
        .from("carts")
        .insert({ user_id: userId })
        .select("id")
        .single();
      userCart = created;
    }

    // Get guest cart
    const { data: guestCart } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("guest_token", guestToken)
      .maybeSingle();

    if (!guestCart || !userCart) return { merged: 0 };

    // Get guest items
    const { data: guestItems } = await supabaseAdmin
      .from("cart_items")
      .select("product_id, variant_id, quantity")
      .eq("cart_id", guestCart.id);

    if (!guestItems || guestItems.length === 0) return { merged: 0 };

    let mergedCount = 0;

    for (const item of guestItems) {
      const { data: existingItem } = await supabaseAdmin
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", userCart.id)
        .eq("product_id", item.product_id)
        .eq("variant_id", item.variant_id)
        .maybeSingle();

      if (existingItem) {
        await supabaseAdmin
          .from("cart_items")
          .update({ quantity: existingItem.quantity + item.quantity })
          .eq("id", existingItem.id);
      } else {
        await supabaseAdmin
          .from("cart_items")
          .insert({
            cart_id: userCart.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          });
      }
      mergedCount++;
    }

    // Clear guest cart
    await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("cart_id", guestCart.id);

    return { merged: mergedCount };
  }
}
