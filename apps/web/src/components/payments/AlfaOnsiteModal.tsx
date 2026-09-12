"use client";

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@waw/config";
import { PaymentMethod } from "@waw/types";
import { fetchWithCsrf } from "@/lib/csrf";
import {
  X, Loader2, ShieldCheck, Smartphone, Landmark, CheckCircle2, AlertTriangle,
} from "lucide-react";

/**
 * Onsite Bank Alfalah checkout — the buyer NEVER leaves waw.com.pk.
 *
 * Flow (all against OUR api, which holds the merchant credentials):
 *   1. initiate → buyer's wallet/account number starts an APG session
 *   2. bank sends OTP to the buyer
 *   3. buyer types the OTP HERE → process completes the payment
 *   4. server settles via the IPN inquiry; modal polls until PAID
 */
export function AlfaOnsiteModal({
  open,
  onClose,
  orderId,
  orderNumber,
  amountPkr,
  method, // ALFA_WALLET or ALFALAH_ACCOUNT
  buyerPhone,
  buyerEmail,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  amountPkr: number;
  method: PaymentMethod.ALFA_WALLET | PaymentMethod.ALFALAH_ACCOUNT;
  buyerPhone: string;
  buyerEmail?: string;
  onPaid: (orderNumber: string) => void;
}) {
  const [stage, setStage] = useState<"account" | "otp" | "processing" | "done" | "failed">("account");
  const [accountNumber, setAccountNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isWallet = method === PaymentMethod.ALFA_WALLET;
  const otpLength = isWallet ? 8 : 4;

  useEffect(() => {
    if (open) {
      setStage("account");
      setAccountNumber("");
      setOtp("");
      setAuthToken("");
      setError("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const startSession = async () => {
    setError("");
    const acc = accountNumber.replace(/\s/g, "");
    if (!/^\d{8,24}$/.test(acc)) {
      setError(isWallet
        ? "Enter your Alfa Wallet mobile number (8-24 digits)"
        : "Enter your Alfalah account number (8-24 digits)");
      return;
    }
    setBusy(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE_URL}/api/payments/apg/onsite/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          method,
          accountNumber: acc,
          customerPhone: buyerPhone,
          customerEmail: buyerEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start payment");
      setAuthToken(data.authToken);
      setStage("otp");
    } catch (err: any) {
      setError(err.message || "Could not start payment");
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setError("");
    if (otp.length !== otpLength) {
      setError(`Enter the ${otpLength}-digit code`);
      return;
    }
    setBusy(true);
    setStage("processing");
    try {
      const res = await fetchWithCsrf(`${API_BASE_URL}/api/payments/apg/onsite/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          isWallet
            ? { authToken, method, smsOtp: otp }
            : { authToken, method, smsOtac: otp },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Payment failed");
      }
      setStage("done");
      setTimeout(() => onPaid(orderNumber), 1200);
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setStage("failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header — Bank Alfalah brand band */}
        <div className="relative bg-[#EC1C24] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" />
            <div>
              <h2 className="font-black text-lg leading-tight">
                {isWallet ? "Alfa Wallet" : "Alfalah Bank Account"}
              </h2>
              <p className="text-[11px] text-white/85">
                Secured by Bank Alfalah · PKR {amountPkr.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-white/75">
            Order {orderNumber} — you never leave Waw
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {stage === "account" && (
            <>
              <p className="text-sm text-slate-600">
                {isWallet
                  ? "Enter the mobile number registered with your Alfa Wallet. You'll receive an 8-digit OTP on that number."
                  : "Enter your Alfalah bank account number. You'll receive a 4-digit OTAC code on your registered mobile."}
              </p>
              <div className="flex items-center gap-2 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#EC1C24]">
                {isWallet ? <Smartphone className="w-5 h-5 text-slate-400" /> : <Landmark className="w-5 h-5 text-slate-400" />}
                <input
                  autoFocus
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 24))}
                  placeholder={isWallet ? "03XXXXXXXXX" : "Account number"}
                  className="flex-1 outline-none text-sm font-mono tracking-wide"
                />
              </div>
              <button
                onClick={startSession}
                disabled={busy}
                className="w-full py-3.5 bg-[#EC1C24] hover:bg-[#c8161d] text-white font-bold rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {busy ? "Connecting to Bank Alfalah…" : "Send OTP"}
              </button>
            </>
          )}

          {stage === "otp" && (
            <>
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isWallet
                    ? "An 8-digit OTP was sent to your Alfa Wallet number."
                    : "A 4-digit OTAC was sent to your registered mobile."}
                </span>
              </div>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={otpLength}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder={"•".repeat(otpLength)}
                className="w-full text-center text-2xl font-mono tracking-[0.6em] border border-slate-200 rounded-2xl py-4 focus:ring-2 focus:ring-[#EC1C24] outline-none"
              />
              <button
                onClick={submitOtp}
                disabled={busy || otp.length !== otpLength}
                className="w-full py-3.5 bg-[#EC1C24] hover:bg-[#c8161d] text-white font-bold rounded-2xl text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Pay PKR {amountPkr.toLocaleString()}
              </button>
              <button
                onClick={() => { setStage("account"); setOtp(""); setError(""); }}
                className="w-full text-xs text-slate-500 hover:text-slate-800 py-1"
              >
                Use a different number
              </button>
            </>
          )}

          {stage === "processing" && (
            <div className="py-10 flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-[#EC1C24]" />
              <p className="text-sm font-medium">Confirming with Bank Alfalah…</p>
              <p className="text-xs text-slate-400">Do not close this window</p>
            </div>
          )}

          {stage === "done" && (
            <div className="py-10 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              <p className="text-base font-black text-slate-900">Payment Successful</p>
              <p className="text-xs text-slate-500">Order {orderNumber} confirmed</p>
            </div>
          )}

          {stage === "failed" && (
            <div className="py-8 flex flex-col items-center gap-4">
              <AlertTriangle className="w-12 h-12 text-amber-500" />
              <p className="text-sm font-bold text-slate-800">Payment not completed</p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => { setStage("otp"); setError(""); }}
                  className="flex-1 py-3 bg-[#EC1C24] hover:bg-[#c8161d] text-white font-bold rounded-2xl text-sm"
                >
                  Try another code
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-center text-slate-400 leading-relaxed pt-1">
            <ShieldCheck className="w-3 h-3 inline mr-1" />
            Your bank credentials are verified by Bank Alfalah directly. Waw never sees your PIN or password.
          </p>
        </div>
      </div>
    </div>
  );
}
