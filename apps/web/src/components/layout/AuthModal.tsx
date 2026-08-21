'use client';

import { useState } from 'react';
import {
  X,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phone: string) => void;
}) {
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'SUCCESS'>('PHONE');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('OTP');
    }, 800);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('SUCCESS');
      setTimeout(() => {
        if (onSuccess) onSuccess(phone);
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 z-10 space-y-6 text-slate-900 animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-xs shrink-0">
            <WhatsAppIcon className="w-8 h-8 drop-shadow-xs" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-950">
              {step === 'PHONE' ? 'WhatsApp Instant Sign In' : step === 'OTP' ? 'Verify WhatsApp OTP' : 'Logged In!'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {step === 'PHONE' ? 'Passwordless 6-digit WhatsApp OTP verification' : 'Enter the 6-digit code sent to your phone'}
            </p>
          </div>
        </div>

        {/* ── STEP 1: Phone Input ─────────────────────────────────────────── */}
        {step === 'PHONE' && (
          <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Mobile Phone Number (WhatsApp)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>We will send a 6-digit one-time code to your WhatsApp. No password required.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white" />
              <span>{loading ? 'Sending Code...' : 'Send WhatsApp Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── STEP 2: 6-Digit OTP ─────────────────────────────────────────── */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 text-xs">
            <div className="text-center space-y-1">
              <div className="font-bold text-slate-700">Sent code to:</div>
              <div className="font-black text-slate-900 text-sm">{phone}</div>
            </div>

            {/* OTP Boxes */}
            <div className="flex justify-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-11 h-12 text-center text-lg font-black bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-black py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>{loading ? 'Verifying Code...' : 'Verify & Continue'}</span>
            </button>
          </form>
        )}

        {/* ── STEP 3: Success ─────────────────────────────────────────────── */}
        {step === 'SUCCESS' && (
          <div className="py-6 text-center space-y-3 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-black text-lg text-slate-950">Successfully Verified!</h4>
            <p className="text-xs text-slate-500 font-medium">
              Welcome to Waw.pk. Loading your profile and account dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
