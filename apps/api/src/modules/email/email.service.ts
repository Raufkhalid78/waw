import { logger } from "../../config/logger.js";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface OrderEmailData {
  buyerName: string;
  buyerEmail: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalPkr: number;
  shippingAddress: string;
  paymentMethod: string;
  trackingUrl?: string;
}

/**
 * Email service using SendGrid API.
 * Falls back to logging in development if SENDGRID_API_KEY is not set.
 */
export class EmailService {
  private static apiKey: string;
  private static fromEmail: string;
  private static fromName: string;

  static init() {
    this.apiKey = process.env.SENDGRID_API_KEY || "";
    this.fromEmail = process.env.EMAIL_FROM || "noreply@waw.com.pk";
    this.fromName = process.env.EMAIL_FROM_NAME || "Waw";

    if (!this.apiKey) {
      logger.warn("SENDGRID_API_KEY not set - emails will be logged only");
    }
  }

  /**
   * Send an email via SendGrid API
   */
  static async send(options: EmailOptions): Promise<void> {
    if (!this.apiKey) {
      logger.info("Email (dev mode)", {
        to: options.to,
        subject: options.subject,
      });
      return;
    }

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
              subject: options.subject,
            },
          ],
          from: {
            email: this.fromEmail,
            name: this.fromName,
          },
          content: [
            {
              type: "text/html",
              value: options.html,
            },
            ...(options.text
              ? [{ type: "text/plain", value: options.text }]
              : []),
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.error("SendGrid API error", {
          status: response.status,
          body,
        });
      }
    } catch (err: any) {
      logger.error("Email send failed", { error: err.message });
    }
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(data: OrderEmailData): Promise<void> {
    const itemsHtml = data.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">PKR ${item.price.toLocaleString()}</td>
          </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#FEF600;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#1a1a2e;margin:0">Waw</h1>
        </div>
        <div style="background:#fff;padding:30px;border:1px solid #e5e7eb">
          <h2 style="color:#1a1a2e">Order Confirmed!</h2>
          <p>Hi ${data.buyerName},</p>
          <p>Your order <strong>#${data.orderNumber}</strong> has been confirmed.</p>
          
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px;text-align:left">Item</th>
                <th style="padding:8px;text-align:center">Qty</th>
                <th style="padding:8px;text-align:right">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:8px;font-weight:bold">Total</td>
                <td style="padding:8px;text-align:right;font-weight:bold">PKR ${data.totalPkr.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <p><strong>Payment:</strong> ${data.paymentMethod}</p>
          <p><strong>Delivery Address:</strong> ${data.shippingAddress}</p>
          
          ${data.trackingUrl ? `<p><a href="${data.trackingUrl}" style="background:#FEF600;color:#1a1a2e;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Track Your Order</a></p>` : ""}
          
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#6b7280;font-size:12px">Thank you for shopping with Waw!</p>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: data.buyerEmail,
      subject: `Order Confirmed - #${data.orderNumber}`,
      html,
    });
  }

  /**
   * Send shipping notification email
   */
  static async sendShippingNotification(data: {
    buyerName: string;
    buyerEmail: string;
    orderNumber: string;
    trackingUrl: string;
    courier: string;
    trackingNumber: string;
  }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#FEF600;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#1a1a2e;margin:0">Waw</h1>
        </div>
        <div style="background:#fff;padding:30px;border:1px solid #e5e7eb">
          <h2 style="color:#1a1a2e">Your Order Has Shipped!</h2>
          <p>Hi ${data.buyerName},</p>
          <p>Your order <strong>#${data.orderNumber}</strong> is on its way!</p>
          <p><strong>Courier:</strong> ${data.courier}</p>
          <p><strong>Tracking:</strong> ${data.trackingNumber}</p>
          <p><a href="${data.trackingUrl}" style="background:#FEF600;color:#1a1a2e;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Track Your Order</a></p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#6b7280;font-size:12px">Thank you for shopping with Waw!</p>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: data.buyerEmail,
      subject: `Order Shipped - #${data.orderNumber}`,
      html,
    });
  }

  /**
   * Send delivery confirmation email
   */
  static async sendDeliveryConfirmation(data: {
    buyerName: string;
    buyerEmail: string;
    orderNumber: string;
  }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#FEF600;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#1a1a2e;margin:0">Waw</h1>
        </div>
        <div style="background:#fff;padding:30px;border:1px solid #e5e7eb">
          <h2 style="color:#1a1a2e">Order Delivered!</h2>
          <p>Hi ${data.buyerName},</p>
          <p>Your order <strong>#${data.orderNumber}</strong> has been delivered.</p>
          <p>We hope you enjoy your purchase! If you have a moment, please leave a review.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
          <p style="color:#6b7280;font-size:12px">Thank you for shopping with Waw!</p>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: data.buyerEmail,
      subject: `Order Delivered - #${data.orderNumber}`,
      html,
    });
  }
}
