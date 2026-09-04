import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { logger } from "../../config/logger.js";

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }
      const result = await AuthService.loginWithEmail(email, password);
      res.json(result);
    } catch (err: any) {
      logger.error("Auth login failed", { message: err.message });
      res.status(401).json({ error: err.message });
    }
  }

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
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const profile = await AuthService.syncOAuthUser({
        id: user.id,
        email: user.email,
      });
      res.json({ user: profile });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
