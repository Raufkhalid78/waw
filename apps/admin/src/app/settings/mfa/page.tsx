"use client";

import { useState, useEffect, useRef } from "react";
import { FadeIn } from "@/components/Motion";
import { Shield, QrCode, CheckCircle2, XCircle, AlertTriangle, Copy, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function mfaApi(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}/api/admin/mfa${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function MfaSettingsPage() {
  const [status, setStatus] = useState<{ enrolled: boolean; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const data = await mfaApi("/status");
      setStatus(data);
    } catch {
      setStatus({ enrolled: false, enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    setError("");
    setSuccess("");
    try {
      const data = await mfaApi("/enroll", { method: "POST" });
      setOtpauthUrl(data.otpauthUrl);
      setSecret(data.secret);
      drawQrCode(data.otpauthUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  const drawQrCode = (text: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Simple QR code rendering using the canvas
    // For production, use a QR code library like `qrcode`
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Draw placeholder with instruction
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#374151";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Scan this URI with", size / 2, size / 2 - 30);
    ctx.fillText("your authenticator app", size / 2, size / 2 - 10);
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Google Authenticator, Authy,", size / 2, size / 2 + 15);
    ctx.fillText("or 1Password", size / 2, size / 2 + 32);

    // Draw the otpauth:// URI as text
    ctx.font = "9px monospace";
    ctx.fillStyle = "#9333ea";
    const lines = text.match(/.{1,35}/g) || [];
    lines.forEach((line, i) => {
      ctx.fillText(line, size / 2, size / 2 + 60 + i * 14);
    });
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError("Code must be 6 digits");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      await mfaApi("/verify", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode }),
      });
      setSuccess("MFA enabled successfully!");
      setVerifyCode("");
      checkStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError("Enter your 6-digit code to disable MFA");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      await mfaApi("/disable", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode }),
      });
      setSuccess("MFA disabled successfully");
      setVerifyCode("");
      setOtpauthUrl("");
      setSecret("");
      checkStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <FadeIn>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-500" />
          Multi-Factor Authentication
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Add an extra layer of security to your admin account with TOTP-based MFA
        </p>
      </FadeIn>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">MFA Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {status?.enabled
                ? "MFA is active on your account"
                : "MFA is not yet configured"}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            status?.enabled
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {status?.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {/* Enrollment Flow */}
      {!status?.enabled && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            {otpauthUrl ? "Step 2: Verify Code" : "Step 1: Enroll in MFA"}
          </h3>

          {!otpauthUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                To enable MFA, you&apos;ll need an authenticator app like Google Authenticator,
                Authy, or 1Password installed on your phone.
              </p>
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2"
              >
                {enrolling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {enrolling ? "Generating..." : "Start MFA Enrollment"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-gray-600">
                    Copy this secret key into your authenticator app manually, or scan the QR code:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <code className="flex-1 text-xs font-mono text-gray-800 break-all">{secret}</code>
                    <button
                      onClick={copySecret}
                      className="p-1.5 hover:bg-gray-200 rounded-lg shrink-0"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="shrink-0">
                  <canvas
                    ref={canvasRef}
                    className="border border-gray-200 rounded-xl"
                    width={200}
                    height={200}
                  />
                  <p className="text-[10px] text-gray-400 text-center mt-1">
                    Copy the URI above into a QR generator
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="text-xs font-bold text-gray-700">
                  Enter the 6-digit code from your authenticator app:
                </label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono text-center tracking-widest focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                  <button
                    onClick={handleVerify}
                    disabled={verifying || verifyCode.length !== 6}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-200 text-white font-bold rounded-xl text-sm flex items-center gap-2"
                  >
                    {verifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Verify & Enable
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disable MFA */}
      {status?.enabled && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Disable MFA
          </h3>
          <p className="text-sm text-gray-600">
            Enter your 6-digit code to disable MFA on your account.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono text-center tracking-widest focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <button
              onClick={handleDisable}
              disabled={verifying || verifyCode.length !== 6}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-400 disabled:bg-gray-200 text-white font-bold rounded-xl text-sm flex items-center gap-2"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Disable MFA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
