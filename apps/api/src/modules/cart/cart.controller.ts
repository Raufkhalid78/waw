import { Request, Response } from "express";
import { CartService } from "./cart.service.js";

export class CartController {
  /**
   * GET /api/cart?guestToken=xxx
   */
  static async getCart(req: Request, res: Response) {
    try {
      const guestToken = req.query.guestToken as string;
      if (!guestToken) {
        return res.status(400).json({ error: "guestToken is required" });
      }

      const cart = await CartService.getOrCreateGuestCart(guestToken);
      const items = await CartService.getCartItems(cart.id);

      res.json({ cartId: cart.id, items });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/cart/items
   */
  static async addItem(req: Request, res: Response) {
    try {
      const { guestToken, productId, variantId, quantity } = req.body;
      if (!guestToken || !productId) {
        return res.status(400).json({ error: "guestToken and productId are required" });
      }

      const cart = await CartService.getOrCreateGuestCart(guestToken);
      await CartService.addItem(cart.id, productId, quantity || 1, variantId);

      const items = await CartService.getCartItems(cart.id);
      res.status(201).json({ cartId: cart.id, items });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * PATCH /api/cart/items
   */
  static async updateItem(req: Request, res: Response) {
    try {
      const { guestToken, productId, variantId, quantity } = req.body;
      if (!guestToken || !productId) {
        return res.status(400).json({ error: "guestToken and productId are required" });
      }

      const cart = await CartService.getOrCreateGuestCart(guestToken);
      await CartService.updateQuantity(cart.id, productId, quantity, variantId);

      const items = await CartService.getCartItems(cart.id);
      res.json({ cartId: cart.id, items });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/cart/items
   */
  static async removeItem(req: Request, res: Response) {
    try {
      const { guestToken, productId, variantId } = req.body;
      if (!guestToken || !productId) {
        return res.status(400).json({ error: "guestToken and productId are required" });
      }

      const cart = await CartService.getOrCreateGuestCart(guestToken);
      await CartService.removeItem(cart.id, productId, variantId);

      const items = await CartService.getCartItems(cart.id);
      res.json({ cartId: cart.id, items });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/cart
   */
  static async clearCart(req: Request, res: Response) {
    try {
      const { guestToken } = req.body;
      if (!guestToken) {
        return res.status(400).json({ error: "guestToken is required" });
      }

      const cart = await CartService.getOrCreateGuestCart(guestToken);
      await CartService.clearCart(cart.id);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/cart/merge
   */
  static async mergeGuestCart(req: Request, res: Response) {
    try {
      const { guestToken } = req.body;
      const user = (req as any).user;

      if (!guestToken || !user?.id) {
        return res.status(400).json({ error: "guestToken and auth required" });
      }

      const result = await CartService.mergeGuestCartToUser(guestToken, user.id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
