'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchUserPreferences, updateUserPreferences } from '@/lib/api';

type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

// Translation dictionaries
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.categories': 'Categories',
    'nav.stores': 'Stores',
    'nav.deals': 'Deals',
    'nav.sell': 'Sell on WAW',
    'nav.account': 'Account',
    'nav.orders': 'My Orders',
    'nav.wishlist': 'Wishlist',
    'nav.cart': 'Cart',
    'nav.search': 'Search products, brands, and more...',
    'nav.deliverTo': 'Deliver to',
    'nav.allCategories': 'All Categories',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.logout': 'Logout',

    // Product
    'product.addToCart': 'Add to Cart',
    'product.buyNow': 'Buy Now',
    'product.inStock': 'In Stock',
    'product.outOfStock': 'Out of Stock',
    'product.onlyLeft': 'Only {count} left',
    'product.reviews': '{count} reviews',
    'product.rating': '{rating} rating',
    'product.sold': '{count} sold',
    'product.freeDelivery': 'FREE delivery',
    'product.deliveryFee': 'Delivery fee: PKR {fee}',
    'product.selectVariant': 'Select Variant',
    'product.selected': 'Selected: {variant}',
    'product.overview': 'Overview',
    'product.reviewsTab': 'Reviews',
    'product.qa': 'Q&A',
    'product.askQuestion': 'Ask a Question',
    'product.questionSubmitted': 'Question submitted!',
    'product.otherSellers': 'Other Sellers on WAW ({count})',
    'product.visitStore': 'Visit Store',
    'product.share': 'Share',
    'product.wishlist': 'Wishlist',
    'product.orderViaWhatsApp': 'Order via WhatsApp',

    // Cart
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Shipping',
    'cart.free': 'FREE',
    'cart.gst': 'GST ({rate}%)',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to Checkout',
    'cart.freeDeliveryThreshold': 'Add PKR {amount} more for FREE delivery',
    'cart.qualifiesFreeDelivery': 'You qualify for FREE delivery!',

    // Checkout
    'checkout.title': 'Checkout',
    'checkout.shippingAddress': 'Shipping Address',
    'checkout.fullName': 'Full Name',
    'checkout.phone': 'Phone Number',
    'checkout.email': 'Email (optional)',
    'checkout.address': 'Address',
    'checkout.city': 'City',
    'checkout.province': 'Province',
    'checkout.selectCity': 'Select your city',
    'checkout.selectProvince': 'Select province',
    'checkout.paymentMethod': 'Payment Method',
    'checkout.cod': 'Cash on Delivery',
    'checkout.card': 'Credit/Debit Card',
    'checkout.raast': 'Raast QR',
    'checkout.placeOrder': 'Place Order — PKR {total}',
    'checkout.orderSummary': 'Order Summary',
    'checkout.estimatedDelivery': 'Estimated Delivery',

    // Account
    'account.title': 'My Account',
    'account.profile': 'Profile',
    'account.settings': 'Settings',
    'account.theme': 'Theme',
    'account.language': 'Language',
    'account.darkMode': 'Dark Mode',
    'account.lightMode': 'Light Mode',
    'account.systemMode': 'System',
    'account.english': 'English',
    'account.urdu': 'اردو',
    'account.addresses': 'Saved Addresses',
    'account.referrals': 'Referrals',
    'account.help': 'Help & Support',

    // Seller
    'seller.title': 'Seller Center',
    'seller.dashboard': 'Dashboard',
    'seller.products': 'Products',
    'seller.orders': 'Orders',
    'seller.payouts': 'Payouts',
    'seller.settings': 'Settings',

    // Footer
    'footer.about': 'About WAW',
    'footer.aboutText': 'Pakistan\'s premium online marketplace connecting verified sellers with customers nationwide.',
    'footer.customerService': 'Customer Service',
    'footer.helpCenter': 'Help Center',
    'footer.contactUs': 'Contact Us',
    'footer.returns': 'Returns & Refunds',
    'footer.shipping': 'Shipping Info',
    'footer.sellerInfo': 'Seller Information',
    'footer.sellOnWAW': 'Sell on WAW',
    'footer.sellerPortal': 'Seller Portal',
    'footer.sellerGuidelines': 'Seller Guidelines',
    'footer.categories': 'Categories',
    'footer.connect': 'Connect With Us',
    'footer.newsletter': 'Subscribe to our newsletter',
    'footer.emailPlaceholder': 'Enter your email',
    'footer.subscribe': 'Subscribe',
    'footer.copyright': '© {year} Waw Pakistan. All rights reserved.',
    'footer.deliveryHubs': 'Delivery Hubs',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.close': 'Close',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.pakistan': 'Pakistan',
    'common.pk': 'PK',
  },
  ur: {
    // Navigation
    'nav.home': 'ہوم',
    'nav.categories': 'زمرے',
    'nav.stores': 'دکانیں',
    'nav.deals': 'ڈیلز',
    'nav.sell': 'واو پر بیچیں',
    'nav.account': 'اکاؤنٹ',
    'nav.orders': 'میرے آرڈرز',
    'nav.wishlist': 'پسندیدہ',
    'nav.cart': 'ٹوکری',
    'nav.search': 'مصنوعات، برانڈز، اور مزید تلاش کریں...',
    'nav.deliverTo': 'ڈلیوری',
    'nav.allCategories': 'تمام زمرے',
    'nav.login': 'لاگ ان',
    'nav.signup': 'سائن اپ',
    'nav.logout': 'لاگ آؤٹ',

    // Product
    'product.addToCart': 'ٹوکری میں شامل کریں',
    'product.buyNow': 'ابھی خریدیں',
    'product.inStock': 'دستیاب ہے',
    'product.outOfStock': 'دستیاب نہیں',
    'product.onlyLeft': 'صرف {count} باقی',
    'product.reviews': '{count} جائزے',
    'product.rating': '{rating} ریٹنگ',
    'product.sold': '{count} فروخت',
    'product.freeDelivery': 'مفت ڈلیوری',
    'product.deliveryFee': 'ڈلیوری فیس: PKR {fee}',
    'product.selectVariant': 'variety منتخب کریں',
    'product.selected': 'منتخب: {variant}',
    'product.overview': 'جائزہ',
    'product.reviewsTab': 'جائزے',
    'product.qa': 'سوال و جواب',
    'product.askQuestion': 'سوال پوچھیں',
    'product.questionSubmitted': 'سوال جمع ہو گیا!',
    'product.otherSellers': 'واو پر دیگر فروخت کنندگان ({count})',
    'product.visitStore': 'دکان میں جائیں',
    'product.share': 'شیئر کریں',
    'product.wishlist': 'پسندیدہ',
    'product.orderViaWhatsApp': 'واٹس ایپ پر آرڈر کریں',

    // Cart
    'cart.title': 'خریداری کی ٹوکری',
    'cart.empty': 'آپ کی ٹوکری خالی ہے',
    'cart.subtotal': 'ذیلی کل',
    'cart.shipping': 'شپنگ',
    'cart.free': 'مفت',
    'cart.gst': 'GST ({rate}%)',
    'cart.total': 'کل',
    'cart.checkout': 'چیک آؤٹ پر جائیں',
    'cart.freeDeliveryThreshold': 'مفت ڈلیوری کے لیے PKR {amount} مزید شامل کریں',
    'cart.qualifiesFreeDelivery': 'آپ مفت ڈلیوری کے مستحق ہیں!',

    // Checkout
    'checkout.title': 'چیک آؤٹ',
    'checkout.shippingAddress': 'شپنگ پتہ',
    'checkout.fullName': 'پورا نام',
    'checkout.phone': 'فون نمبر',
    'checkout.email': 'ای میل (اختیاری)',
    'checkout.address': 'پتہ',
    'checkout.city': 'شہر',
    'checkout.province': 'صوبہ',
    'checkout.selectCity': 'اپنا شہر منتخب کریں',
    'checkout.selectProvince': 'صوبہ منتخب کریں',
    'checkout.paymentMethod': 'ادائیگی کا طریقہ',
    'checkout.cod': 'ڈلیvery پر نقد',
    'checkout.card': 'کریٹ/ڈیبٹ کارڈ',
    'checkout.raast': 'راست QR',
    'checkout.placeOrder': 'آرڈر دیں — PKR {total}',
    'checkout.orderSummary': 'آرڈر کا خلاصہ',
    'checkout.estimatedDelivery': 'اندازہ ڈلیوری',

    // Account
    'account.title': 'میرا اکاؤنٹ',
    'account.profile': 'پروفائل',
    'account.settings': 'ترتیبات',
    'account.theme': 'تھیم',
    'account.language': 'زبان',
    'account.darkMode': 'ڈارک موڈ',
    'account.lightMode': 'لائٹ موڈ',
    'account.systemMode': 'سسٹم',
    'account.english': 'English',
    'account.urdu': 'اردو',
    'account.addresses': 'محفوظ شدہ پتے',
    'account.referrals': 'حوالہ جات',
    'account.help': 'مدد و سپورٹ',

    // Seller
    'seller.title': 'سلر سینٹر',
    'seller.dashboard': 'ڈیش بورڈ',
    'seller.products': 'مصنوعات',
    'seller.orders': 'آرڈرز',
    'seller.payouts': 'ادائیگیاں',
    'seller.settings': 'ترتیبات',

    // Footer
    'footer.about': 'واو کے بارے میں',
    'footer.aboutText': 'پاکستان کا پریمیم آنلائن مارکیٹ پلیس جو تصدیق شدہ فروخت کنندگان کو ملک بھر کے صارفین سے جوڑتا ہے۔',
    'footer.customerService': 'صارف سروس',
    'footer.helpCenter': 'مدد مرکز',
    'footer.contactUs': 'ہم سے رابطہ کریں',
    'footer.returns': 'واپسی و ریفنڈ',
    'footer.shipping': 'شپنگ معلومات',
    'footer.sellerInfo': 'فروخت کنندہ معلومات',
    'footer.sellOnWAW': 'واو پر بیچیں',
    'footer.sellerPortal': 'فروخت کنندہ پورٹل',
    'footer.sellerGuidelines': 'فروخت کنندہ رہنمائی',
    'footer.categories': 'زمرے',
    'footer.connect': 'ہم سے جڑیں',
    'footer.newsletter': 'ہماری نیوز لیٹر کی سبسکرائب کریں',
    'footer.emailPlaceholder': 'اپنا ای میل درج کریں',
    'footer.subscribe': 'سبسکرائب',
    'footer.copyright': '© {year} واو پاکستان۔ جملہ حقوق محفوظ ہیں۔',
    'footer.deliveryHubs': 'ڈلیوری حب',

    // Common
    'common.loading': 'لوڈ ہو رہا ہے...',
    'common.error': 'کچھ غلط ہوا',
    'common.retry': 'دوبارہ کوشش کریں',
    'common.save': 'محفوظ کریں',
    'common.cancel': 'منسوخ کریں',
    'common.delete': 'حذف کریں',
    'common.edit': 'ترمیم',
    'common.submit': 'جمع کریں',
    'common.back': 'واپس',
    'common.next': 'اگلا',
    'common.close': 'بند کریں',
    'common.yes': 'ہاں',
    'common.no': 'نہیں',
    'common.pakistan': 'پاکستان',
    'common.pk': 'پاک',
  },
};

// Interpolation: replace {key} with values
function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return Object.entries(values).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
    template
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load from localStorage first (instant), then sync with DB
    const saved = localStorage.getItem('waw-language') as Language | null;
    if (saved && ['en', 'ur'].includes(saved)) {
      setLanguageState(saved);
      applyLanguage(saved);
    }
    // Try to load from DB (for logged-in users only — the endpoint is
    // auth-guarded, so calling it anonymously just produces 401 noise)
    const hasSessionCookie =
      typeof document !== 'undefined' &&
      document.cookie
        .split(';')
        .some((c) => c.trim().startsWith('waw_session='));
    if (hasSessionCookie) {
      fetchUserPreferences().then((prefs) => {
        if (prefs.language && ['en', 'ur'].includes(prefs.language)) {
          setLanguageState(prefs.language);
          applyLanguage(prefs.language);
          localStorage.setItem('waw-language', prefs.language);
        }
      }).catch(() => {});
    }
  }, []);

  const applyLanguage = (lang: Language) => {
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
  };

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem('waw-language', newLang);
    applyLanguage(newLang);
    // Persist to DB for logged-in users
    updateUserPreferences({ language: newLang }).catch(() => {});
  };

  const t = (key: string, values?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    const template = dict[key] || translations.en[key] || key;
    return interpolate(template, values);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
