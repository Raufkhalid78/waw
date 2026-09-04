import { Request, Response } from "express";

export class SupportController {
  static async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { SupportService } = await import("./support.service.js");
      const ticket = await SupportService.createTicket(user.id, req.body);
      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listTickets(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { SupportService } = await import("./support.service.js");
      const tickets = await SupportService.getBuyerTickets(user.id);
      res.json(tickets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getTicket(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { SupportService } = await import("./support.service.js");
      const ticket = await SupportService.getTicketDetails(req.params.id, user.id, user.role);
      res.json(ticket);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async addMessage(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { SupportService } = await import("./support.service.js");
      const msg = await SupportService.addMessage(
        req.params.id,
        user.id,
        user.role,
        user.name || user.email || "User",
        req.body.message,
        req.body.attachments,
      );
      res.status(201).json(msg);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
