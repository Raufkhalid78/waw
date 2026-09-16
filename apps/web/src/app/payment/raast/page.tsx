"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE_URL } from "@waw/config";

/**
 * Raast P2M QR payment page.
 *
 * The checkout flow creates the order, then redirects here with the dynamic
 * QR payload from the payment initiation API. The buyer scans the QR with
 * their bank / wallet app (SBP Raast P2M), pays, and this page polls the
 * order's payment status until the Raast webhook marks it PAID, then forwards
 * to /payment/result.
 */
function RaastPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const payload = searchParams.get("payload") || "";
  const orderNumber = searchParams.get("order") || "";

  const [status, setStatus] = useState<"PENDING" | "PAID" | "FAILED">("PENDING");
  const [elapsed, setElapsed] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Recover the pending order id from the checkout handoff for polling.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("waw-pending-payment-order");
      if (pending) {
        const parsed = JSON.parse(pending);
        if (parsed.orderId) setOrderId(parsed.orderId);
      }
    } catch {}
  }, []);

  // Poll the order's payment status every 5s. For logged-in buyers the
  // /api/orders/:id endpoint returns payment_status; guests fall back to
  // waiting for the payment/result handoff. Polling failures are tolerated
  // (403 for guests) — the page still shows the QR so the buyer can pay.
  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const order = await res.json();
        const paymentStatus = order?.paymentStatus || order?.payment_status;
        if (paymentStatus === "PAID" || paymentStatus === "CONFIRMED") {
          setStatus("PAID");
          clearInterval(interval);
          setTimeout(() => {
            router.push(`/payment/result?order=${encodeURIComponent(orderId)}&status=success`);
          }, 1200);
        } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
          setStatus("FAILED");
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId, router]);

  // Expire the page after 10 minutes — Raast QR payloads are dynamic/short-lived.
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (elapsed >= 600 && status === "PENDING") setStatus("FAILED");
  }, [elapsed, status]);

  if (!payload) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-slate-950">Raast Payment</h1>
        <p className="text-sm text-slate-600 mt-2">
          Payment session not found. Please return to checkout and try again.
        </p>
        <Link
          href="/cart"
          className="mt-6 inline-block px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl"
        >
          Back to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-5">
        <div>
          <h1 className="text-xl font-black text-slate-950">
            Scan & Pay with Raast
          </h1>
          {orderNumber && (
            <p className="text-xs text-slate-500 mt-1">
              Order <span className="font-mono font-bold">{orderNumber}</span>
            </p>
          )}
        </div>

        {status === "PENDING" && (
          <>
            <div className="flex justify-center p-4 bg-white rounded-xl border-2 border-amber-300 w-fit mx-auto">
              <QRCodeSVG value={payload} size={220} level="M" />
            </div>
            <ol className="text-left text-xs text-slate-600 space-y-1.5">
              <li>1. Open your bank or wallet app (Meezan, HBL, Easypaisa, JazzCash…)</li>
              <li>2. Choose <strong>Raast / Scan to Pay</strong></li>
              <li>3. Scan this QR and approve the payment</li>
            </ol>
            <p className="text-[11px] text-slate-400 animate-pulse">
              Waiting for payment confirmation… (this page checks automatically)
            </p>
          </>
        )}

        {status === "PAID" && (
          <div className="py-6 space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-2xl">
              ✓
            </div>
            <p className="font-bold text-emerald-700">Payment received!</p>
            <p className="text-xs text-slate-500">Redirecting to your order…</p>
          </div>
        )}

        {status === "FAILED" && (
          <div className="py-6 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center text-2xl">
              ✕
            </div>
            <p className="font-bold text-red-700">Payment not completed</p>
            <p className="text-xs text-slate-500">
              The payment window expired or was cancelled. Your order is saved —
              you can retry payment from your order page or contact support.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              {orderId ? (
                <Link
                  href={`/orders/${orderId}`}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm"
                >
                  View Order
                </Link>
              ) : (
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm"
                >
                  Home
                </Link>
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          Raast is an SBP instant payment system. Waw never sees your bank
          credentials.
        </p>
      </div>
    </div>
  );
}

export default function RaastPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 text-center text-slate-400 text-sm">
          Loading payment…
        </div>
      }
    >
      <RaastPaymentContent />
    </Suspense>
  );
}
