import { Request, Response } from "express";

export class LogisticsController {
  static async listCities(req: Request, res: Response): Promise<void> {
    try {
      const { ServiceabilityService } = await import("./serviceability.service.js");
      const cities = await ServiceabilityService.listServiceableCities();
      res.json(cities);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async checkDestination(req: Request, res: Response): Promise<void> {
    try {
      const city = req.query.city as string;
      const sellerCity = req.query.sellerCity as string;
      const paymentMethod = req.query.paymentMethod as any;
      const { ServiceabilityService } = await import("./serviceability.service.js");
      const result = await ServiceabilityService.checkDestination(
        city,
        sellerCity,
        paymentMethod,
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async handlePostExWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature =
        (req.headers["x-postex-signature"] as string) ||
        (req.headers["x-postex-hmac-sha256"] as string) || undefined;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const { CourierService } = await import("./courier.service.js");
      const isValid = CourierService.verifyPostExWebhookSignature(
        rawBody,
        signature,
      );
      if (!isValid) {
        res.status(401).json({ error: "Invalid PostEx webhook signature" });
        return;
      }

      const result = await CourierService.handlePostExWebhook(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
