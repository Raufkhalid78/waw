'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { CartDrawer } from './CartDrawer';
import { AuthModal } from './AuthModal';
import { Logo } from '@/components/ui/Logo';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Globe,
  Menu,
  X,
  ArrowRight,
  Store,
  ShieldCheck,
  Flame,
  Truck,
  Check,
  Package,
  Sparkles,
  Megaphone,
  Mic,
  MicOff,
  LogOut,
} from 'lucide-react';

const PAKISTAN_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Peshawar',
  'Multan',
  'Sialkot',
  'Gujranwala',
  'Quetta',
];

const SEARCH_CATEGORIES = [
  'All Categories',
  'Mobiles & Tech',
  "Women's Lawn",
  'Leather & Footwear',
  'Smart Watches',
  'Sialkot Sports',
  'Power & Chargers',
  'Fragrances & Attar',
  'Home & Kitchen',
];

const POPULAR_SEARCHES = [
  'Khaadi Lawn 2026',
  'AirPods Pro ANC',
  'Pure Leather Wallet',
  'Peshawari Chappal',
  'Amoled Smart Watch',
  'Sialkot Match Football',
  'Royal Oud Attar',
];

const PROMOTIONAL_ANNOUNCEMENTS = [
  {
    id: 1,
    tag: '⚡ MEGA DEALS',
    text: 'Azadi Celebration: Up to 50% OFF with voucher AZADI2026 at checkout!',
    link: '/category/mobiles-tech',
    linkText: 'Shop Deals',
  },
  {
    id: 2,
    tag: '🚚 FREE DELIVERY',
    text: 'Zero shipping charges on all orders above PKR 5,000 nationwide across Pakistan.',
    link: '/cart',
    linkText: 'Learn More',
  },
  {
    id: 3,
    tag: '🛡️ SBP ESCROW',
    text: '100% Safe Prepayments & 7-Day Hassle-Free Returns with State Bank Escrow Protection.',
    link: '/buyer-protection',
    linkText: 'View Guarantee',
  },
  {
    id: 4,
    tag: '🏪 SELL ON WAW',
    text: '0% Listing Fees & Nationwide TCS Pickups for verified Pakistani merchants.',
    link: '/sell',
    linkText: 'Register Store',
  },
];

const CATEGORY_LINKS_EN = [
  { label: '⚡ Waw Express', href: '/search?sellerType=1P', highlight: 'express' },
  { label: '🔥 Mega Deals', href: '/search', highlight: 'deals' },
  { label: '🏬 Verified Shops', href: '/search?sellerType=3P', highlight: 'shops' },
  { label: 'Electronics & Mobiles', href: '/category/mobiles-tech' },
  { label: 'Beauty & Fragrance', href: '/category/home-heritage' },
  { label: "Women's Lawn & Fashion", href: '/category/womens-lawn' },
  { label: 'Peshawari Footwear', href: '/category/peshawari-chappal' },
  { label: 'Leather Craft & Bags', href: '/category/leather-craft' },
  { label: 'Sialkot Sports Goods', href: '/category/sialkot-sports' },
  { label: 'Power & Chargers', href: '/category/mobiles-tech' },
  { label: 'Smart Watches', href: '/category/mobiles-tech' },
];

const CATEGORY_LINKS_UR = [
  { label: '⚡ واو ایکسپریس', href: '/search?sellerType=1P', highlight: 'express' },
  { label: '🔥 میگا ڈیلز', href: '/search', highlight: 'deals' },
  { label: '🏬 تصدیق شدہ دکانیں', href: '/search?sellerType=3P', highlight: 'shops' },
  { label: 'موبائل اور ٹیک', href: '/category/mobiles-tech' },
  { label: 'عطر اور خوشبویات', href: '/category/home-heritage' },
  { label: 'خواتین کے ملبوسات', href: '/category/womens-lawn' },
  { label: 'پشاوری چپل', href: '/category/peshawari-chappal' },
  { label: 'چمڑے کا سامان', href: '/category/leather-craft' },
  { label: 'سیالکوٹ اسپورٹس', href: '/category/sialkot-sports' },
  { label: 'چارجرز اور بیٹریاں', href: '/category/mobiles-tech' },
  { label: 'سمارٹ گھڑیاں', href: '/category/mobiles-tech' },
];

const TRANSLATIONS = {
  EN: {
    deliverTo: 'Deliver to',
    pakistan: 'Pakistan',
    searchPlaceholder: 'What are you looking for?',
    mobileSearchPlaceholder: 'What are you looking for?',
    allCategories: 'All Categories',
    accountHello: 'Hi, Sign In',
    accountText: 'Account',
    orders: 'Orders',
    wishlist: 'Wishlist',
    cart: 'Cart',
    selectCity: 'Select Your Delivery City:',
    popularSearches: 'Popular Searches in Pakistan',
    allCategoriesBtn: 'ALL CATEGORIES',
    categoriesHeader: 'Waw Categories',
    langToggle: 'اردو',
  },
  UR: {
    deliverTo: 'ترسیل برائے',
    pakistan: 'پاکستان',
    searchPlaceholder: 'آپ کیا تلاش کر رہے ہیں؟',
    mobileSearchPlaceholder: 'آپ کیا تلاش کر رہے ہیں؟',
    allCategories: 'تمام کیٹیگریز',
    accountHello: 'خوش آمدید',
    accountText: 'اکاؤنٹ',
    orders: 'آرڈرز',
    wishlist: 'پسندیدہ',
    cart: 'کارٹ',
    selectCity: 'اپنا ترسیلی شہر منتخب کریں:',
    popularSearches: 'پاکستان میں مقبول تلاش',
    allCategoriesBtn: 'تمام کیٹیگریز',
    categoriesHeader: 'واو کیٹیگریز',
    langToggle: 'English',
  },
};

export function Header() {
  const router = useRouter();
  const { items, selectedCity, setSelectedCity, wishlist, language, setLanguage, user, logout } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const wishlistCount = wishlist.length;

  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [showCityModal, setShowCityModal] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedSearchCat, setSelectedSearchCat] = useState('All Categories');
  const [searchFocused, setSearchFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;
  const categoryLinks = language === 'UR' ? CATEGORY_LINKS_UR : CATEGORY_LINKS_EN;

  const handleVoiceSearch = () => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'UR' ? 'ur-PK' : 'en-PK';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        router.push(`/search?q=${encodeURIComponent(transcript)}`);
      };

      recognition.start();
    } else {
      alert('Voice search is available on Google Chrome, Safari, and Edge.');
    }
  };

  // Auto rotate admin announcements every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePromoIndex((prev) => (prev + 1) % PROMOTIONAL_ANNOUNCEMENTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchFocused(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (selectedSearchCat !== 'All Categories') params.set('category', selectedSearchCat);
    router.push(`/search?${params.toString()}`);
  };

  const catScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  const checkScrollability = () => {
    if (catScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = catScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language === 'UR' ? 'rtl' : 'ltr';
      document.documentElement.lang = language === 'UR' ? 'ur' : 'en';
    }
    checkScrollability();
    const el = catScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        el.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [language]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (catScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      catScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScrollability, 300);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activePromo = PROMOTIONAL_ANNOUNCEMENTS[activePromoIndex];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        {/* ── Tier 1: Dynamic Admin Promotional & Announcement Ticker ───────── */}
        <div className="bg-[#0B0F19] text-white text-[11px] font-medium py-1.5 px-3 sm:px-6 lg:px-10 xl:px-12 border-b border-slate-800">
          <div className="w-full flex items-center justify-between gap-4">
            {/* Rotating Live Announcement */}
            <div className="flex items-center gap-2.5 overflow-hidden text-center sm:text-left mx-auto sm:mx-0">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider shrink-0 animate-pulse">
                {activePromo.tag}
              </span>
              <span className="text-slate-200 truncate">
                {activePromo.text}
              </span>
              <Link
                href={activePromo.link}
                className="hidden md:inline-flex items-center gap-1 text-amber-400 font-bold hover:underline shrink-0 ml-1"
              >
                <span>{activePromo.linkText}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Announcement Controls & Ticker Indicators */}
            <div className="hidden sm:flex items-center gap-2 text-slate-400 shrink-0">
              <div className="flex items-center gap-1">
                {PROMOTIONAL_ANNOUNCEMENTS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePromoIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                      activePromoIndex === idx ? 'bg-amber-400 w-3' : 'bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tier 2: Premium Noon-Inspired Navigation Bar ──────────────────── */}
        <div className="bg-[#FEEB00] py-2 px-3 sm:px-6 lg:px-10 xl:px-12 border-b border-yellow-400">
          <div className="w-full flex items-center justify-between gap-3 sm:gap-5">
            {/* Left: 'waw' Bold Wordmark + Clean Delivery Pill */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <Logo size="md" />

              {/* Delivery Location Pill */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowCityModal(!showCityModal)}
                  className="flex items-center gap-1.5 text-slate-900 hover:bg-black/10 font-bold text-xs sm:text-sm bg-black/5 px-3 py-1.5 rounded-full transition-all cursor-pointer border border-black/10 shadow-xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-900" />
                  <span className="font-semibold text-slate-800">{t.deliverTo}:</span>
                  <strong className="font-black text-slate-950 underline underline-offset-2">
                    {selectedCity}
                  </strong>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-800" />
                </button>

                {/* City Picker Dropdown */}
                {showCityModal && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 text-slate-900 animate-fade-up">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                      {t.selectCity}
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto">
                      {PAKISTAN_CITIES.map((city) => (
                        <button
                          key={city}
                          onClick={() => {
                            setSelectedCity(city);
                            setShowCityModal(false);
                          }}
                          className={`text-left px-2.5 py-1.5 text-xs rounded-xl font-bold transition-colors flex items-center justify-between cursor-pointer ${
                            selectedCity === city
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{city}</span>
                          {selectedCity === city && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Search Input */}
            <div ref={searchRef} className="flex-1 max-w-2xl relative hidden sm:block">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center rounded-full bg-white shadow-xs border border-slate-200 hover:border-slate-400 focus-within:ring-2 focus-within:ring-slate-950 overflow-hidden transition-all px-3.5 py-1.5"
              >
                <Search className="w-4 h-4 text-slate-500 shrink-0 mr-2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none font-semibold"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 mr-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Voice Search Mic */}
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  title="Voice Search (English & Urdu)"
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Autocomplete & Trending Searches Dropdown */}
              {searchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-fade-up">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      {t.popularSearches}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCHES.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setQuery(tag);
                          setSearchFocused(false);
                          router.push(`/search?q=${encodeURIComponent(tag)}`);
                        }}
                        className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Search className="w-3 h-3 text-slate-400" />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Language, User Profile, Orders, Wishlist, Cart */}
            <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-black text-slate-950">
              {/* Language Switch */}
              <button
                onClick={() => setLanguage(language === 'EN' ? 'UR' : 'EN')}
                className="hidden lg:flex items-center gap-1.5 hover:bg-black/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold"
              >
                <Globe className="w-3.5 h-3.5 text-slate-900" />
                <span>{t.langToggle}</span>
              </button>

              <span className="text-slate-900/20 hidden lg:inline font-light">|</span>

              {/* Account / User Sign In or User Dropdown */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 hover:bg-black/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-black text-slate-900"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline truncate max-w-[95px]">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-800" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 text-slate-900 overflow-hidden animate-fade-up">
                      <div className="p-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{user.emailOrPhone}</p>
                        <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                          Verified Customer
                        </span>
                      </div>

                      <div className="p-1.5 space-y-0.5 text-xs font-bold text-slate-700">
                        <Link
                          href="/account"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors"
                        >
                          <User className="w-4 h-4 text-slate-500" />
                          <span>My Profile & Addresses</span>
                        </Link>

                        <Link
                          href="/orders/WAW-PK-88492"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors"
                        >
                          <Package className="w-4 h-4 text-slate-500" />
                          <span>My Orders & Tracking</span>
                        </Link>

                        <Link
                          href="/wishlist"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors"
                        >
                          <Heart className="w-4 h-4 text-rose-500" />
                          <span>Saved Wishlist ({wishlistCount})</span>
                        </Link>

                        <Link
                          href="/buyer-protection"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>SBP Escrow Guarantee</span>
                        </Link>

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-black transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>{language === 'UR' ? 'لاگ آؤٹ کریں' : 'Sign Out'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 hover:bg-black/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-900" />
                  <span className="hidden md:inline">{t.accountHello} ▾</span>
                </button>
              )}

              <span className="text-slate-900/20 hidden md:inline font-light">|</span>

              {/* Orders */}
              <Link
                href="/orders/WAW-PK-98213"
                className="hidden md:flex items-center gap-1.5 hover:bg-black/10 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <Package className="w-4 h-4 text-slate-900" />
                <span>{t.orders}</span>
              </Link>

              <span className="text-slate-900/20 hidden md:inline font-light">|</span>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="relative flex items-center gap-1.5 hover:bg-black/10 px-2.5 py-1.5 rounded-lg transition-all"
                title="View Saved Wishlist"
              >
                <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-600 fill-rose-600' : 'text-slate-900'}`} />
                <span className="hidden md:inline">{t.wishlist}</span>
                {wishlistCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center -ml-0.5">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <span className="text-slate-900/20 hidden md:inline font-light">|</span>

              {/* Cart */}
              <button
                onClick={() => setCartDrawerOpen(true)}
                className="relative flex items-center gap-1.5 hover:bg-black/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-slate-900" />
                <span className="hidden md:inline">{t.cart}</span>
                {cartCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center -ml-0.5">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-1.5 rounded-lg text-slate-950 hover:bg-black/10"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="mt-2.5 sm:hidden">
            <div className="flex items-center rounded-full bg-white shadow-xs border border-transparent px-3.5 py-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.mobileSearchPlaceholder}
                className="w-full bg-transparent text-xs text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Tier 3: Category Strip (Noon Style) ─────────────────────────────── */}
        <div className="bg-white border-b border-slate-200/80 hidden sm:block relative shadow-xs">
          <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 flex items-center justify-between gap-3 py-0.5">
            {/* Left: Mega Categories Button */}
            <div 
              className="relative group"
              onMouseEnter={() => setMegaMenuOpen(true)}
              onMouseLeave={() => setMegaMenuOpen(false)}
            >
              <button className="flex items-center gap-1.5 bg-slate-950 text-amber-400 px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 hover:bg-slate-900 transition-all shadow-xs cursor-pointer my-1">
                <Menu className="w-3.5 h-3.5" />
                <span>{t.allCategoriesBtn}</span>
              </button>

              {/* Mega Menu Dropdown */}
              {megaMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-[600px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 z-50 animate-fade-up grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-black text-slate-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Top Categories
                    </h4>
                    <ul className="space-y-2">
                      {SEARCH_CATEGORIES.slice(1).map((cat) => (
                        <li key={cat} className="group/item">
                          <Link href={`/category/${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-sm font-bold text-slate-600 hover:text-amber-600 flex items-center gap-2 transition-colors">
                            <ArrowRight className="w-3 h-3 text-slate-300 group-hover/item:text-amber-500 transition-colors" />
                            {cat}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 flex flex-col justify-between border border-amber-100">
                    <div>
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm mb-2 inline-block">Flash Deals</span>
                      <h5 className="font-black text-slate-900 text-lg leading-tight mb-2">Save up to 50% on Electronics</h5>
                      <p className="text-xs font-medium text-slate-600 mb-4">Limited time offer on smartphones and wearables.</p>
                    </div>
                    <Link href="/category/mobiles-tech" className="text-xs font-black bg-slate-900 text-white py-2 px-4 rounded-lg text-center hover:bg-slate-800 transition-colors">Shop Now</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Middle: Scrollable Category Links Container */}
            <div className="relative flex-1 min-w-0 flex items-center">
              {canScrollLeft && (
                <button
                  onClick={() => scrollCategories('left')}
                  className="absolute left-0 z-10 p-1.5 rounded-full bg-white border border-slate-300 shadow-md text-slate-800 hover:text-amber-600 hover:bg-white transition-all -ml-1 cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              <div
                ref={catScrollRef}
                className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 text-xs font-bold scroll-smooth px-1"
              >
                {categoryLinks.map((link) => {
                  let badgeClass = 'text-slate-700 hover:text-amber-600 hover:bg-slate-100';
                  if (link.highlight === 'express') {
                    badgeClass = 'bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-lg shadow-xs';
                  } else if (link.highlight === 'deals') {
                    badgeClass = 'bg-rose-100 text-rose-700 font-black px-2.5 py-0.5 rounded-lg';
                  } else if (link.highlight === 'shops') {
                    badgeClass = 'bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-lg';
                  }

                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${badgeClass}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {canScrollRight && (
                <button
                  onClick={() => scrollCategories('right')}
                  className="absolute right-0 z-10 p-1.5 rounded-full bg-white/95 border border-slate-300 shadow-md text-slate-800 hover:text-amber-600 hover:bg-white transition-all -mr-1"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <Logo size="md" />
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-1">
                {categoryLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-700"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <Link
                href="/sell"
                className="w-full bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Store className="w-4 h-4" />
                <span>Sell on Waw</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* WhatsApp Phone OTP Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => router.push('/account')}
      />
    </>
  );
}
