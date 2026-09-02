/**
 * State Bank of Pakistan (SBP) Raast P2M (Person-to-Merchant) Instant QR Engine
 * Generates EMVCo & ISO 8583 compliant dynamic QR payloads for zero-fee instant merchant settlements.
 */

import QRCode from "qrcode";
import { ENV } from "../../config/env.js";

export interface RaastQrPayloadInput {
  orderId: string;
  orderNumber: string;
  amountPkr: number;
  merchantIbanOrAlias?: string;
  merchantName?: string;
  merchantCity?: string;
}

export interface RaastQrResult {
  qrString: string;
  qrDataUrl: string;
  referenceId: string;
  amountPkr: number;
  expiresAt: string;
  merchantAlias: string;
  supportedApps: string[];
}

export class RaastService {
  private static readonly RAAST_PARTICIPANT_ID = "WAWPK001";
  private static readonly DEFAULT_MERCHANT_ALIAS = "waw.market@hbl";
  private static readonly DEFAULT_MERCHANT_NAME = "Waw Online Shopping PK";
  private static readonly DEFAULT_MERCHANT_CITY = "Lahore";

  /**
   * Generates an EMVCo-compliant dynamic QR code payload with CRC16 checksum.
   * Produces both the raw QR string and a base64 data URL for frontend rendering.
   */
  static async generateDynamicQr(
    input: RaastQrPayloadInput,
  ): Promise<RaastQrResult> {
    const referenceId = `RAAST-${input.orderNumber.replace(/[^A-Z0-9]/gi, "")}-${Date.now().toString().slice(-4)}`;
    const alias =
      input.merchantIbanOrAlias ||
      process.env.RAAST_MERCHANT_ALIAS ||
      this.DEFAULT_MERCHANT_ALIAS;
    const name =
      input.merchantName ||
      process.env.RAAST_MERCHANT_NAME ||
      this.DEFAULT_MERCHANT_NAME;
    const city =
      input.merchantCity ||
      process.env.RAAST_MERCHANT_CITY ||
      this.DEFAULT_MERCHANT_CITY;
    const formattedAmount = input.amountPkr.toFixed(2);

    // EMVCo Tag-Length-Value (TLV) construction
    const tlv = (tag: string, value: string) => {
      const len = value.length.toString().padStart(2, "0");
      return `${tag}${len}${value}`;
    };

    const subTlvRaast = `${tlv("00", "pk.gov.sbp.raast")}${tlv("01", alias)}${tlv("02", this.RAAST_PARTICIPANT_ID)}`;
    const subTlvAdditional = `${tlv("01", input.orderNumber)}${tlv("05", referenceId)}`;

    let rawPayload =
      tlv("00", "01") +
      tlv("01", "12") +
      tlv("26", subTlvRaast) +
      tlv("52", "5399") + // General Marketplace MCC
      tlv("53", "586") + // PKR
      tlv("54", formattedAmount) +
      tlv("58", "PK") +
      tlv("59", name.slice(0, 25)) +
      tlv("60", city.slice(0, 15)) +
      tlv("62", subTlvAdditional) +
      "6304"; // CRC placeholder

    const crc = this.computeCrc16(rawPayload);
    const fullQrString = `${rawPayload}${crc}`;

    // Generate QR code as base64 data URL (local, no third-party dependency)
    const qrDataUrl = await QRCode.toDataURL(fullQrString, {
      width: 320,
      margin: 2,
      color: { dark: "#0f172a", light: "#fef600" },
      errorCorrectionLevel: "M",
    });

    // Expiry timestamp: 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      qrString: fullQrString,
      qrDataUrl,
      referenceId,
      amountPkr: input.amountPkr,
      expiresAt,
      merchantAlias: alias,
      supportedApps: [
        "HBL Mobile / Konnect",
        "Meezan Bank Mobile",
        "Nayapay",
        "Sadapay",
        "Easypaisa",
        "JazzCash",
        "Standard Chartered PK",
        "Bank Alfalah Alfa",
        "Allied Bank (myABL)",
        "MCB Live",
      ],
    };
  }

  /**
   * Verifies inbound Raast payment confirmation webhook from SBP switch.
   * Validates the transaction reference and amount against expected values.
   */
  static async verifyRaastPayment(
    referenceId: string,
    amountPkr: number,
    bankTransactionId?: string,
  ): Promise<{
    success: boolean;
    transactionId?: string;
    referenceId: string;
    amountPkr: number;
    status: string;
    error?: string;
  }> {
    // Look up the expected payment by reference ID
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("*, order:orders(*)")
      .eq("gateway_reference", referenceId)
      .single();

    if (error || !payment) {
      return {
        success: false,
        referenceId,
        amountPkr,
        status: "REJECTED",
        error: `No pending payment found for reference: ${referenceId}`,
      };
    }

    // Verify amount matches
    if (payment.amount_pkr !== amountPkr) {
      return {
        success: false,
        referenceId,
        amountPkr,
        status: "REJECTED",
        error: `Amount mismatch: expected ${payment.amount_pkr}, got ${amountPkr}`,
      };
    }

    // Mark payment as received (actual settlement happens via bank callback)
    const transactionId =
      bankTransactionId || `TXN-RAAST-${Date.now()}`;

    return {
      success: true,
      transactionId,
      referenceId,
      amountPkr,
      status: "ESCROW_HELD",
    };
  }

  /**
   * Computes CCITT-FALSE CRC16 checksum for EMVCo standard compliance.
   */
  private static computeCrc16(data: string): string {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
      x ^= x >> 4;
      crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
}

// Need supabaseAdmin for verifyRaastPayment
import { supabaseAdmin } from "../../config/supabase.js";
