import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";

export class UserController {
  static async listAddresses(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data, error } = await supabaseAdmin
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createAddress(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { full_name, phone, street_address, city, province, postal_code, is_default } = req.body;
      if (is_default) {
        await supabaseAdmin
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }
      const { data, error } = await supabaseAdmin
        .from("addresses")
        .insert({
          user_id: user.id,
          full_name,
          phone,
          street_address,
          city,
          province,
          postal_code: postal_code || null,
          is_default: Boolean(is_default),
        })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteAddress(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { error } = await supabaseAdmin
        .from("addresses")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", user.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listWishlist(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data, error } = await supabaseAdmin
        .from("wishlists")
        .select("id, product_id, created_at, products(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async addToWishlist(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { product_id } = req.body;
      const { data, error } = await supabaseAdmin
        .from("wishlists")
        .upsert({ user_id: user.id, product_id }, { onConflict: "user_id,product_id" })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async removeFromWishlist(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { error } = await supabaseAdmin
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", req.params.productId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
