import { Request, Response } from "express";

export class ConfigController {
  static async getStorefrontConfig(req: Request, res: Response): Promise<void> {
    try {
      // In a fully dynamic system, these would be fetched from a CMS or DB table.
      // For now, we govern them here at the API level instead of hardcoding in the frontend.
      const config = {
        cities: [
          "Lahore",
          "Karachi",
          "Islamabad",
          "Rawalpindi",
          "Faisalabad",
          "Peshawar",
          "Multan",
          "Sialkot",
          "Gujranwala",
          "Quetta",
        ],
        popularSearches: [
          "Khaadi Lawn 2026",
          "AirPods Pro ANC",
          "Pure Leather Wallet",
          "Peshawari Chappal",
          "Amoled Smart Watch",
          "Sialkot Match Football",
          "Royal Oud Attar",
        ],
        promotionalAnnouncements: [
          {
            id: 1,
            tag: "⚡ MEGA DEALS",
            text: "Azadi Celebration: Up to 50% OFF with voucher AZADI2026 at checkout!",
            link: "/category/mobiles-tech",
            linkText: "Shop Deals",
          },
          {
            id: 2,
            tag: "🚚 FREE DELIVERY",
            text: "Zero shipping charges on all orders above PKR 5,000 nationwide across Pakistan.",
            link: "/cart",
            linkText: "Learn More",
          },
          {
            id: 3,
            tag: "🛡️ SECURE CHECKOUT",
            text: "100% Safe Prepayments & 7-Day Hassle-Free Returns with Escrow Buyer Protection.",
            link: "/buyer-protection",
            linkText: "View Guarantee",
          },
          {
            id: 4,
            tag: "🏪 SELL ON WAW",
            text: "0% Listing Fees & Nationwide PostEx Pickups for verified Pakistani merchants.",
            link: "/sell",
            linkText: "Register Store",
          },
        ]
      };
      
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
