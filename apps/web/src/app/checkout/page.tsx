'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { PaymentMethod, CheckoutQuoteResponse } from '@waw/types';
import { ShieldCheck, Truck, MessageSquare, CheckCircle2, Lock, ArrowLeft, QrCode, Sparkles, Smartphone, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { fetchCheckoutQuote, createOrderApi, initiatePaymentApi } from '@/lib/api';

const PK_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, paymentMethod, setPaymentMethod, clearCart, selectedCity } = useCartStore();

  const [formData, setFormData] = useState({
    fullName: 'Ali Khan',
    phone: '+923001234567',
    address: 'House 42, Street 8, Phase 5, DHA',
    city: selectedCity || 'Lahore',
    province: 'Punjab',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<CheckoutQuoteResponse | null>(null);  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountPkr: number; description: string } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  // 1. Fetch Server-Authoritative Quote on Cart / Form change
  useEffect(() => {
    if (items.length === 0) return;

    let isMounted = true;
    async function loadQuote() {
      try {
        setQuoteLoading(true);
        setQuoteError(null);
        const quote = await fetchCheckoutQuote({
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          shippingCity: formData.city,
          paymentMethod,
          couponCode: appliedVoucher?.code,
        });
        if (isMounted) {
          setQuoteData(quote);
          if (quote.couponDiscountPkr > 0 && appliedVoucher) {
            setAppliedVoucher((prev) => prev ? { ...prev, discountPkr: quote.couponDiscountPkr } : null);
          }
        }
      } catch (err: any) {
        if (isMounted) setQuoteError(err.message || 'Unable to calculate live pricing');
      } finally {
        if (isMounted) setQuoteLoading(false);
      }
    }

    loadQuote();
    return () => { isMounted = false; };
  }, [items, formData.city, paymentMethod, appliedVoucher?.code]);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError('');
    const code = voucherInput.trim().toUpperCase();

    if (!code) return;
    setAppliedVoucher({ code, discountPkr: 0, description: `Promo Code ${code}` });
    setVoucherInput('');
  };

  const finalTotalPkr = quoteData?.totalPkr || 0;
  const subtotalPkr = quoteData?.subtotalPkr || 0;
  const shippingFeePkr = quoteData?.shippingFeePkr || 0;
  const codFeePkr = quoteData?.codFeePkr || 0;
  const discountAmount = quoteData?.couponDiscountPkr || 0;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteData?.quoteToken) {
      setQuoteError('Please wait for the live price quote to finish calculating.');
      return;
    }

    setIsSubmitting(true);
    setQuoteError(null);

    try {
      const orderResult = await createOrderApi({
        quoteToken: quoteData.quoteToken,
        buyerName: formData.fullName,
        buyerPhone: formData.phone,
        shippingAddress: formData.address,
        shippingCity: formData.city,
        shippingProvince: formData.province,
        paymentMethod,
        notes: formData.notes,
      });

      const orderId = orderResult.orderId;

      if (
        paymentMethod === PaymentMethod.XPAY_CARD ||
        paymentMethod === PaymentMethod.XPAY_WALLET_JAZZCASH ||
        paymentMethod === PaymentMethod.XPAY_WALLET_EASYPAISA
      ) {
        const paymentSession = await initiatePaymentApi({
          orderId,
          paymentMethod,
          customerPhone: formData.phone,
          returnUrl: `${window.location.origin}/orders/${orderId}`,
        });

        if (paymentSession.checkoutUrl) {
          clearCart();
          window.location.href = paymentSession.checkoutUrl;
          return;
        }
      }

      // COD or default success
      clearCart();
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      setQuoteError(err.message || 'Failed to complete order placement. Please try again.');
      setIsSubmitting(false);
    }
  };
  if (items.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Your Cart is Empty</h1>
        <p className="text-sm text-slate-500">
          Explore thousands of verified products from top artisans and brands across Pakistan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-500 transition-colors text-xs"
        >
          Return to Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
      
    </div>
  );
}
