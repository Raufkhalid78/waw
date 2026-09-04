import axios from "axios";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface WhatsAppMessagePayload {
  toPhone: string; // e.g. "+923001234567"
  templateName: string;
  parameters: string[];
}

export class WhatsAppService {
  private static readonly META_API_VERSION = "v21.0";
  private static readonly META_BASE_URL = "https://graph.facebook.com";

  /**
   * Sends a WhatsApp message using Meta Cloud API.
   * Falls back to console logging in development.
   */
  private static async sendMetaMessage(
    phone: string,
    messageBody: string,
  ): Promise<boolean> {
    if (!ENV.META_WHATSAPP_TOKEN || !ENV.META_WHATSAPP_PHONE_NUMBER_ID) {
      logger.info(`📱 [WhatsApp DEV] To ${phone}: ${messageBody}`);
      return true;
    }

    try {
      const url = `${this.META_BASE_URL}/${this.META_API_VERSION}/${ENV.META_WHATSAPP_PHONE_NUMBER_ID}/messages`;

      await axios.post(
        url,
        {
          messaging_product: "whatsapp",
          to: phone.replace("+", ""),
          type: "text",
          text: { body: messageBody },
        },
        {
          headers: {
            Authorization: `Bearer ${ENV.META_WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      return true;
    } catch (err: any) {
      logger.warn(
        "WhatsApp Meta API error:",
        err.response?.data || err.message,
      );
      // Still log for dev visibility
      logger.info(`📱 [WhatsApp FALLBACK] To ${phone}: ${messageBody}`);
      return false;
    }
  }

  /**
   * Sends a 6-digit OTP code to the user's WhatsApp number.
   * Uses Twilio Verify if configured, otherwise falls back to Meta Cloud API.
   */
  static async sendOtp(phone: string, otpCode: string): Promise<boolean> {
    logger.info(`📱 [WhatsApp Service] Sending OTP ${otpCode} to ${phone}`);

    // If Twilio Verify is configured, use it
    if (ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_VERIFY_SERVICE_SID) {
      try {
        const url = `https://verify.twilio.com/v2/Services/${ENV.TWILIO_VERIFY_SERVICE_SID}/Verifications`;
        const authHeader = Buffer.from(
          `${ENV.TWILIO_ACCOUNT_SID}:${ENV.TWILIO_AUTH_TOKEN}`,
        ).toString("base64");

        await axios.post(
          url,
          new URLSearchParams({
            To: phone,
            Channel: "whatsapp",
            CustomCode: otpCode,
          }),
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );
        return true;
      } catch (err: any) {
        logger.warn(
          "Twilio WhatsApp Verify failed, falling back to Meta API:",
          err.response?.data || err.message,
        );
      }
    }

    // Fallback: Send OTP via Meta WhatsApp Cloud API
    const message = `Your Waw verification code is: *${otpCode}*\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
    return this.sendMetaMessage(phone, message);
  }

  /**
   * Sends an order confirmation message with payment details.
   */
  static async sendOrderConfirmed(
    phone: string,
    orderNumber: string,
    totalPkr: number,
    isCod: boolean,
  ): Promise<void> {
    const paymentText = isCod ? "Cash on Delivery (COD)" : "Prepaid Online";
    const message = [
      `✨ *Waw (واو) Order Confirmed!*`,
      ``,
      `Order Number: *${orderNumber}*`,
      `Total Amount: *PKR ${totalPkr.toLocaleString()}*`,
      `Payment: *${paymentText}*`,
      ``,
      `Track your order anytime at:`,
      `https://waw.com.pk/orders/${orderNumber}`,
      ``,
      `Thank you for shopping on Waw! 🛍️`,
    ].join("\n");

    await this.sendMetaMessage(phone, message);
  }

  /**
   * Sends a tracking link when shipment is dispatched.
   */
  static async sendOrderShipped(
    phone: string,
    orderNumber: string,
    courierName: string,
    trackingNumber: string,
    trackingUrl: string,
  ): Promise<void> {
    const message = [
      `🚚 *Waw (واو) Shipment Dispatched!*`,
      ``,
      `Your order *${orderNumber}* is on its way via *${courierName}*.`,
      ``,
      `Tracking Number: *${trackingNumber}*`,
      `Live Tracking: ${trackingUrl}`,
      ``,
      `Estimated delivery: 2-5 business days`,
    ].join("\n");

    await this.sendMetaMessage(phone, message);
  }

  /**
   * Sends a delivery confirmation message.
   */
  static async sendOrderDelivered(
    phone: string,
    orderNumber: string,
    totalPkr: number,
    isCod: boolean,
  ): Promise<void> {
    const paymentNote = isCod
      ? `\nPayment of *PKR ${totalPkr.toLocaleString()}* was collected as Cash on Delivery.`
      : "";

    const message = [
      `🎉 *Waw (واو) Order Delivered!*`,
      ``,
      `Your order *${orderNumber}* has been delivered successfully.`,
      paymentNote,
      ``,
      `We hope you love your purchase!`,
      `Leave a review to help other shoppers:`,
      `https://waw.com.pk/orders/${orderNumber}/review`,
      ``,
      `Need help? Reply to this message or visit waw.com.pk/support`,
    ].join("\n");

    await this.sendMetaMessage(phone, message);
  }

  /**
   * Sends an order cancellation notification.
   */
  static async sendOrderCancelled(
    phone: string,
    orderNumber: string,
    reason?: string,
  ): Promise<void> {
    const reasonText = reason ? `\nReason: *${reason}*` : "";

    const message = [
      `❌ *Waw (واو) Order Cancelled*`,
      ``,
      `Your order *${orderNumber}* has been cancelled.`,
      reasonText,
      ``,
      `If you believe this is an error, please contact support:`,
      `https://waw.com.pk/support`,
      ``,
      `We're sorry for the inconvenience.`,
    ].join("\n");

    await this.sendMetaMessage(phone, message);
  }

  /**
   * Sends a return request confirmation message.
   */
  static async sendReturnRequested(
    phone: string,
    orderNumber: string,
    returnId: string,
    reason: string,
  ): Promise<void> {
    const message = [
      `📦 *Waw (واو) Return Request Received*`,
      ``,
      `Your return request for order *${orderNumber}* has been submitted.`,
      `Return ID: *${returnId}*`,
      `Reason: *${reason}*`,
      ``,
      `Our team will review your request within 24-48 hours.`,
      `You'll receive a reverse pickup schedule shortly.`,
      ``,
      `Track return status: https://waw.com.pk/returns/${returnId}`,
    ].join("\n");

    await this.sendMetaMessage(phone, message);
  }

  /**
   * Notifies a seller about a new order assignment.
   */
  static async sendSellerNewOrder(
    sellerPhone: string,
    storeName: string,
    orderNumber: string,
    itemSummary: string,
    totalPkr: number,
  ): Promise<void> {
    const message = [
      `🛒 *New Order for ${storeName}!*`,
      ``,
      `Order: *${orderNumber}*`,
      `Items: ${itemSummary}`,
      `Payout: *PKR ${totalPkr.toLocaleString()}*`,
      ``,
      `Log in to fulfill this order:`,
      `https://seller.waw.com.pk/orders`,
      ``,
      `Pack and dispatch within 24 hours for best seller rating.`,
    ].join("\n");

    await this.sendMetaMessage(sellerPhone, message);
  }
}
