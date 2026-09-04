"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Smartphone } from "lucide-react";
import { ScaleIn } from "@/components/Motion";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<"email" | "mobile">("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.user?.role !== "ADMIN") {
        throw new Error("Access denied. Admin only.");
      }

      localStorage.setItem("admin_token", data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/whatsapp-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/whatsapp-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, otp, role: "ADMIN" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OTP verification failed");

      if (data.user?.role !== "ADMIN") {
        throw new Error("Access denied. Admin only.");
      }

      localStorage.setItem("admin_token", data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "GOOGLE" | "APPLE") => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/oauth/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`${provider} login requires Supabase OAuth configuration. Please use email or mobile login.`);
        setLoading(false);
        return;
      }
      localStorage.setItem("admin_token", data.token);
      router.push("/");
    } catch {
      setError(`${provider} login will be available once OAuth providers are configured in Supabase.`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <ScaleIn>
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            {/* Logo */}
            <div className="text-center mb-8">
              <svg viewBox="0 0 1024 1024" className="w-20 h-20 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg">
                <rect x="100" y="100" width="824" height="824" rx="240" fill="#0f0f0f" />
                <path d="M 547.395 196.544 C 466.720 208.319, 400.481 266.221, 377.560 345 C 371.174 366.950, 368.854 388.738, 370.159 414.524 C 373.721 484.909, 414.776 549.536, 478.355 584.837 C 505.927 600.146, 536.387 608.501, 569 609.699 C 610.619 611.229, 646.891 601.758, 684 579.671 C 688.125 577.216, 691.628 575.545, 691.785 575.958 C 692.150 576.921, 686.255 593.068, 681.624 603.788 C 667.662 636.107, 646.313 667.439, 624.256 687.980 C 592.873 717.206, 555.735 735.651, 516.558 741.468 C 504.127 743.314, 475.783 743.572, 463 741.955 C 449.261 740.217, 434.857 737.183, 422.369 733.397 C 381.070 720.878, 338.609 695.017, 303.913 661.254 L 296.326 653.871 262.114 688.185 L 227.903 722.500 236.821 731.095 C 271.777 764.785, 321.647 794.723, 371.500 811.943 C 411.126 825.631, 444.353 831.352, 484.500 831.399 C 534.694 831.457, 577.350 821.377, 621.644 798.989 C 672.988 773.038, 716.300 733.842, 746.499 686 C 755.133 672.321, 768.731 644.709, 774.426 629.290 C 800.627 558.350, 803.610 467.496, 782.859 372.500 C 771.934 322.487, 753.705 286.839, 723.500 256.417 C 690.236 222.914, 650.887 203.052, 604.804 196.501 C 591.980 194.678, 560.012 194.702, 547.395 196.544 M 565.636 293.096 C 523.819 297.508, 488.170 326.047, 473.632 366.750 C 464.538 392.213, 466.603 424.310, 478.965 449.619 C 508.534 510.157, 582.122 530.369, 637.331 493.114 C 665.418 474.161, 682.759 443.902, 685.538 409 C 687.279 387.122, 679.842 359.911, 666.921 340.883 C 660.790 331.855, 647.173 318.061, 638.417 312.008 C 622.972 301.331, 605.827 295.018, 586.836 293.018 C 576.494 291.929, 576.705 291.928, 565.636 293.096" fill="#f7f007" fillRule="evenodd" />
              </svg>
              <h1 className="text-xl font-black text-slate-950">Waw Admin</h1>
              <p className="text-sm text-gray-500 mt-1">Sign in to manage your marketplace</p>
            </div>

            {/* Login Method Toggle */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-bold text-gray-600 mb-4">
              <button
                type="button"
                onClick={() => { setLoginMethod("email"); setOtpSent(false); setError(""); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMethod === "email"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod("mobile"); setOtpSent(false); setError(""); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMethod === "mobile"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 animate-[fadeIn_200ms_ease-out] mb-4">
                {error}
              </div>
            )}

            {/* Email Login Form */}
            {loginMethod === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="admin-input"
                    placeholder="admin@waw.pk"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="admin-input pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            {/* Mobile OTP Login Form */}
            {loginMethod === "mobile" && !otpSent && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="admin-input"
                    placeholder="+923001234567"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Sending OTP..." : "Send WhatsApp OTP"}
                </button>
              </form>
            )}

            {/* Mobile OTP Verify Form */}
            {loginMethod === "mobile" && otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    We sent a 6-digit code to <strong className="text-slate-900">{mobile}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="admin-input text-center text-lg tracking-widest font-mono"
                    placeholder="123456"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(""); }}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
                >
                  Change number
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[10px] uppercase font-bold text-gray-400 tracking-wider shrink-0">
                OR CONTINUE WITH
              </span>
              <div className="border-t border-gray-200 w-full" />
            </div>

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleOAuthLogin("GOOGLE")}
                className="flex items-center justify-center gap-2 p-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin("APPLE")}
                className="flex items-center justify-center gap-2 p-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 fill-gray-900 shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.65-.79 1.1-1.89.98-2.99-1 .04-2.19.67-2.88 1.48-.61.71-1.15 1.83-1.01 2.92 1.12.09 2.26-.62 2.91-1.41z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Admin access only. Unauthorized attempts are logged.
          </p>
        </div>
      </ScaleIn>
    </div>
  );
}
