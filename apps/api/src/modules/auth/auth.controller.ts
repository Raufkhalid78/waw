import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";

export class AuthController {
  static async requestOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      if (!phone) {
        res.status(400).json({ error: "Phone number is required" });
        return;
      }
      const result = await AuthService.requestWhatsAppOtp(phone);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, otp, role, storeName, city } = req.body;
      if (!phone || !otp) {
        res.status(400).json({ error: "Phone and OTP are required" });
        return;
      }
      const result = await AuthService.verifyWhatsAppOtp(
        phone,
        otp,
        role,
        storeName,
        city,
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async syncOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { supabaseUser } = req.body;
      if (!supabaseUser || !supabaseUser.id) {
        res.status(400).json({ error: "Invalid user payload" });
        return;
      }
      const profile = await AuthService.syncOAuthUser(supabaseUser);
      res.json({ user: profile });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
