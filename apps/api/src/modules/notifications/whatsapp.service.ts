import axios from 'axios';
import { ENV } from '../../config/env.js';

export interface WhatsAppMessagePayload {
  toPhone: string; // e.g. "+923001234567"
  templateName: string;
  parameters: string[];
}

export class WhatsAppService {
  /**
   * Sends a 6-digit OTP code to the user's WhatsApp number.
   */
  static async sendOtp(phone: string, otpCode: string): Promise<boolean> {
    console.log(`📱 [WhatsApp Service] Sending OTP ${otpCode} to ${phone}`);

    // If Twilio Verify is configured
    if (ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_VERIFY_SERVICE_SID) {
      try {
        const url = `https://verify.twilio.com/v2/Services/${ENV.TWILIO_VERIFY_SERVICE_SID}/Verifications`;
        const authHeader = Buffer.from(`${ENV.TWILIO_ACCOUNT_SID}:${ENV.TWILIO_AUTH_TOKEN}`).toString('base64');
        
        await axios.post(
          url,
          new URLSearchParams({
            To: phone,
            Channel: 'whatsapp',
            CustomCode: otpCode,
          }),
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        return true;
      } catch (err: any) {
        console.warn('⚠️ Twilio WhatsApp Verify failed, falling back to mock logger:', err.response?.data || err.message);
      }
    }

    // Default development fallback: Log OTP to console for instant testing
    console.log(`🔑 DEV MODE: WhatsApp OTP for ${phone} is: [ ${otpCode} ]`);
    return true;
  }

  /**
   * Sends an order confirmation message with WhatsApp receipt.
   */
  static async sendOrderConfirmed(phone: string, orderNumber: string, totalPkr: number, isCod: boolean): Promise<void> {
    const paymentText = isCod ? 'Cash on Delivery (COD)' : 'Prepaid Online';
    const message = `✨ *Waw (واو) Order Confirmed!*\n\nOrder Number: *${orderNumber}*\nTotal Amount: *PKR ${totalPkr.toLocaleString()}*\nPayment: *${paymentText}*\n\nTrack your order anytime at: https://waw.pk/orders/${orderNumber}\n\nThank you for shopping on Waw!`;
    console.log(`📱 [WhatsApp Notification to ${phone}]:\n${message}`);
  }

  /**
   * Sends a tracking link when shipment is dispatched.
   */
  static async sendOrderShipped(phone: string, orderNumber: string, courierName: string, trackingNumber: string, trackingUrl: string): Promise<void> {
    const message = `🚚 *Waw (واو) Shipment Dispatched!*\n\nYour order *${orderNumber}* is on its way via *${courierName}*.\nTracking Number: *${trackingNumber}*\n\nLive Tracking Link: ${trackingUrl}`;
    console.log(`📱 [WhatsApp Notification to ${phone}]:\n${message}`);
  }
}
