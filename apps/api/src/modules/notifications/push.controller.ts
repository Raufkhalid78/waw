import { Request, Response } from "express";
import { PushService } from "./push.service.js";
import { logger } from "../../config/logger.js";

const VALID_PLATFORMS = new Set(["android", "ios", "web"]);

export class PushController {
  /**
   * POST /api/push/tokens — register a device token (authenticated).
   */
  static async registerToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { token, platform } = req.body || {};
      if (!token || typeof token !== "string" || token.length < 16 || token.length > 4096) {
        res.status(400).json({ error: "A valid FCM token is required" });
        return;
      }

      await PushService.registerToken({
        userId,
        token,
        platform: VALID_PLATFORMS.has(platform) ? platform : "android",
      });

      res.json({ success: true });
    } catch (err: any) {
      logger.error("Push token registration failed", { error: err.message });
      res.status(500).json({ error: "Failed to register device" });
    }
  }

  /**
   * DELETE /api/push/tokens — remove a device token (authenticated, own only).
   */
  static async removeToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Body only — device tokens must not travel in URLs (they leak into
      // proxy/access logs).
      const token = req.body?.token;
      if (!token || typeof token !== "string") {
        res.status(400).json({ error: "token is required" });
        return;
      }

      await PushService.removeToken({ userId, token });
      res.json({ success: true });
    } catch (err: any) {
      logger.error("Push token removal failed", { error: err.message });
      res.status(500).json({ error: "Failed to remove device" });
    }
  }
}
