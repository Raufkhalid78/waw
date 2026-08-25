import Link from 'next/link';
import {
  HelpCircle,
  Mail,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-700 text-xs font-sans">
      {/* ── 1. Top "We're Always Here To Help" Strip ────────────────────────── */}
      <div className="bg-[#F7F7FA] border-b border-slate-200 py-7 px-3 sm:px-6 lg:px-10 xl:px-12">
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Title */}
          <div className="text-center lg:text-left space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              We&apos;re Always Here To Help
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Reach out to us through any of these verified customer support channels
            </p>
          </div>

          {/* Right Support Channels (Help Center, Email, WhatsApp) */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-6 sm:gap-8">
            {/* Help Center */}
            <Link
              href="/help"
              className="flex items-center gap-3.5 group text-left hover:text-amber-600 transition-colors"
            >
              <div className="w-11 h-11 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-700 group-hover:border-amber-400 group-hover:text-amber-600 transition-all shadow-xs group-hover:scale-105">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">HELP CENTER</div>
                <div className="text-xs font-black text-slate-900 group-hover:text-amber-600 mt-0.5">help.waw.com.pk</div>
              </div>
            </Link>

            {/* Email Support */}
            <a
              href="mailto:care@waw.com.pk"
              className="flex items-center gap-3.5 group text-left hover:text-amber-600 transition-colors"
            >
              <div className="w-11 h-11 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-700 group-hover:border-amber-400 group-hover:text-amber-600 transition-all shadow-xs group-hover:scale-105">
                <Mail className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">EMAIL SUPPORT</div>
                <div className="text-xs font-black text-slate-900 group-hover:text-amber-600 mt-0.5">care@waw.com.pk</div>
              </div>
            </a>

            {/* WhatsApp 24/7 Helpline */}
            <a
              href="https://wa.me/923001234567"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 group text-left hover:text-emerald-600 transition-colors"
            >
              <div className="w-11 h-11 rounded-full border border-emerald-300 bg-white flex items-center justify-center transition-all shadow-xs group-hover:scale-110 group-hover:border-emerald-500 overflow-hidden">
                <WhatsAppIcon className="w-8 h-8 drop-shadow-xs" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">WHATSAPP 24/7</div>
                <div className="text-xs font-black text-slate-900 group-hover:text-emerald-600 mt-0.5">+92 (042) 111-WAW</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* ── 2. Main Multi-Column Category & Brand Index ────────────────────── */}
      <div className="py-12 px-3 sm:px-6 lg:px-10 xl:px-12 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-7 sm:gap-5 text-[11px]">
          {/* Column 1: Electronics */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Electronics</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/category/mobiles-tech" className="hover:text-slate-950 transition-colors">Mobiles & Tablets</Link></li>
              <li><Link href="/category/mobiles-tech" className="hover:text-slate-950 transition-colors">Wireless Earbuds</Link></li>
              <li><Link href="/category/mobiles-tech" className="hover:text-slate-950 transition-colors">Smart Watches</Link></li>
              <li><Link href="/category/mobiles-tech" className="hover:text-slate-950 transition-colors">Power Banks</Link></li>
              <li><Link href="/category/mobiles-tech" className="hover:text-slate-950 transition-colors">Fast Chargers & Cables</Link></li>
            </ul>
          </div>

          {/* Column 2: Women's Fashion */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Women&apos;s Fashion</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/category/womens-lawn" className="hover:text-slate-950 transition-colors">Unstitched Lawn</Link></li>
              <li><Link href="/category/womens-lawn" className="hover:text-slate-950 transition-colors">Ready-to-Wear Kurtis</Link></li>
              <li><Link href="/category/womens-lawn" className="hover:text-slate-950 transition-colors">Festive 3-Piece</Link></li>
              <li><Link href="/category/womens-lawn" className="hover:text-slate-950 transition-colors">Luxury Chiffon Dupattas</Link></li>
            </ul>
          </div>

          {/* Column 3: Men's Fashion */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Men&apos;s Heritage</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/category/peshawari-chappal" className="hover:text-slate-950 transition-colors">Peshawari Chappals</Link></li>
              <li><Link href="/category/leather-craft" className="hover:text-slate-950 transition-colors">Pure Leather Wallets</Link></li>
              <li><Link href="/category/leather-craft" className="hover:text-slate-950 transition-colors">Handmade Leather Belts</Link></li>
            </ul>
          </div>

          {/* Column 4: Beauty & Fragrance */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Beauty & Attar</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/category/home-heritage" className="hover:text-slate-950 transition-colors">Pure Royal Oud & Attar</Link></li>
              <li><Link href="/category/home-heritage" className="hover:text-slate-950 transition-colors">Natural Fragrances</Link></li>
            </ul>
          </div>

          {/* Column 5: Sports & Sialkot */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Sialkot Sports</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/category/sialkot-sports" className="hover:text-slate-950 transition-colors">Match Footballs (FIFA Grade)</Link></li>
              <li><Link href="/category/sialkot-sports" className="hover:text-slate-950 transition-colors">English Willow Cricket Bats</Link></li>
              <li><Link href="/category/sialkot-sports" className="hover:text-slate-950 transition-colors">Pro Boxing & Training Gloves</Link></li>
            </ul>
          </div>

          {/* Column 6: Home & Living */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Home & Heritage</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/category/home-heritage" className="hover:text-slate-950 transition-colors">Multani Blue Pottery</Link></li>
              <li><Link href="/category/home-heritage" className="hover:text-slate-950 transition-colors">Handmade Cultural Décor</Link></li>
            </ul>
          </div>

          {/* Column 7: Top Brands */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Top Brands</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/" className="hover:text-amber-600 transition-colors font-bold text-slate-900">Waw Signature 1P</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Khyber Artisans</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Lahore Tech Hub</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Sindh Silk & Lawn</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Sialkot Sports Co.</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Khaadi & J.</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Sapphire Lawn</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Al-Haramain PKR</Link></li>
            </ul>
          </div>

          {/* Column 8: Discover Now */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Discover Waw</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/" className="text-amber-600 font-bold hover:underline">⚡ Waw Express</Link></li>
              <li><Link href="/" className="text-rose-600 font-bold hover:underline">🔥 Flash Deals</Link></li>
              <li><Link href="/" className="text-sky-700 font-bold hover:underline">🏬 Verified Shops</Link></li>
              <li><Link href="/checkout" className="hover:text-slate-950 transition-colors">Sell on Waw</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Seller KYC Policy</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Affiliate Program</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Free Delivery Policy</Link></li>
            </ul>
          </div>

          {/* Column 9: Delivery Hubs */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-950 text-xs tracking-tight uppercase">Delivery Hubs</h4>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Lahore (Central)</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Karachi (South)</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Islamabad (Capital)</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Rawalpindi</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Faisalabad</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Peshawar</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Sialkot</Link></li>
              <li><Link href="/" className="hover:text-slate-950 transition-colors">Quetta & Multan</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── 3. App Download & Social Media Strip ───────────────────────────── */}
      <div className="border-t border-b border-slate-200 py-6 px-3 sm:px-6 lg:px-10 xl:px-12 bg-[#FBFBFC]">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: App Download Badges */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
            <span className="text-xs font-black uppercase text-slate-950 tracking-wider">
              SHOP ON THE GO
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {/* Apple App Store Badge */}
              <a
                href="#"
                className="bg-black hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-xs transition-all hover:scale-105"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 0.92-2.84-.9.04-2 .6-2.65 1.34-.58.65-1.09 1.72-.95 2.73.99.08 2.06-.48 2.68-1.23z" />
                </svg>
                <div className="text-left leading-none">
                  <div className="text-[8px] text-slate-300 font-medium">Download on the</div>
                  <div className="text-xs font-bold text-white mt-0.5">App Store</div>
                </div>
              </a>

              {/* Google Play Badge */}
              <a
                href="#"
                className="bg-black hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-xs transition-all hover:scale-105"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M3.6 1.4L13.7 11.5 3.6 21.6c-.3-.3-.6-.8-.6-1.4V2.8c0-.6.3-1.1.6-1.4z" />
                  <path fill="#FBBC04" d="M17.1 8.1l-3.4 3.4 3.4 3.4 3.9-2.2c1.1-.6 1.1-1.7 0-2.3l-3.9-2.3z" />
                  <path fill="#EA4335" d="M13.7 11.5L3.6 1.4C4.2.8 5.2.8 6.1 1.3l11 6.8-3.4 3.4z" />
                  <path fill="#34A853" d="M13.7 11.5l3.4 3.4-11 6.8c-.9.5-1.9.5-2.5-.1l10.1-10.1z" />
                </svg>
                <div className="text-left leading-none">
                  <div className="text-[8px] text-slate-300 font-medium">GET IT ON</div>
                  <div className="text-xs font-bold text-white mt-0.5">Google Play</div>
                </div>
              </a>

              {/* Huawei AppGallery Badge */}
              <a
                href="#"
                className="bg-black hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-xs transition-all hover:scale-105"
              >
                <div className="w-4 h-4 rounded bg-rose-600 flex items-center justify-center">
                  <span className="text-[9px] font-black text-white">H</span>
                </div>
                <div className="text-left leading-none">
                  <div className="text-[8px] text-slate-300 font-medium">EXPLORE IT ON</div>
                  <div className="text-xs font-bold text-white mt-0.5">AppGallery</div>
                </div>
              </a>
            </div>
          </div>

          {/* Right: Connect With Us Social Icons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-right">
            <span className="text-xs font-black uppercase text-slate-950 tracking-wider">
              CONNECT WITH US
            </span>
            <div className="flex items-center gap-2">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center transition-all hover:scale-110 shadow-xs"
                title="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              </a>

              {/* X (Twitter) */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center transition-all hover:scale-110 shadow-xs"
                title="X (Twitter)"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center transition-all hover:scale-110 shadow-xs"
                title="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center transition-all hover:scale-110 shadow-xs"
                title="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center transition-all hover:scale-110 shadow-xs"
                title="YouTube"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Legal, Payment Badges & Policy Links (Fixed-Dimension Cards) ───── */}
      <div className="bg-[#F7F7FA] py-6 px-3 sm:px-6 lg:px-10 xl:px-12">
        <div className="w-full space-y-4">
          {/* Row 1: Copyright + Official Payment Partner Cards + Policy Links */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
            {/* Copyright */}
            <div className="font-medium text-slate-500">
              © {new Date().getFullYear()} WAW TECHNOLOGIES (SMC-PRIVATE) LIMITED. All Rights Reserved.
            </div>

            {/* Payment Badges — fully inline SVG, no external images */}
            <div className="flex flex-wrap items-center justify-center gap-2">

              {/* ── Mastercard ── */}
              <div className="w-[54px] h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-xs hover:border-slate-300 transition-colors overflow-hidden">
                <svg viewBox="0 0 38 24" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="12" r="10" fill="#EB001B"/>
                  <circle cx="24" cy="12" r="10" fill="#F79E1B"/>
                  <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00"/>
                </svg>
              </div>

              {/* ── VISA ── */}
              <div className="w-[54px] h-7 bg-[#1A1F71] rounded-lg flex items-center justify-center shadow-xs hover:bg-[#151a5e] transition-colors overflow-hidden px-2">
                <svg viewBox="0 0 80 26" className="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <text x="2" y="22" fontFamily="Arial,sans-serif" fontWeight="900" fontStyle="italic" fontSize="26" fill="white" letterSpacing="-1">VISA</text>
                </svg>
              </div>

              {/* ── Raast ── */}
              <div className="w-[54px] h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-xs hover:border-slate-300 transition-colors overflow-hidden p-0.5">
                <img src="/images/payments/raast.svg" alt="Raast" className="h-[23px] w-auto object-contain" />
              </div>

              {/* ── JazzCash ── */}
              <div className="w-[54px] h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-xs hover:border-slate-300 transition-colors overflow-hidden p-0.5">
                <img src="/images/payments/jazzcash.svg" alt="JazzCash" className="h-[20px] w-auto object-contain" />
              </div>

              {/* ── Easypaisa ── */}
              <div className="w-[54px] h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-xs hover:border-slate-300 transition-colors overflow-hidden p-0.5">
                <img src="/images/payments/easypaisa.svg" alt="Easypaisa" className="h-[20px] w-auto object-contain" />
              </div>

              {/* ── PayPak ── */}
              <div className="w-[54px] h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-xs hover:border-slate-300 transition-colors overflow-hidden p-0.5">
                <img src="/images/payments/paypak.svg" alt="PayPak" className="h-[24px] w-auto object-contain" />
              </div>

              {/* ── CASH / COD ── */}
              <div className="w-[54px] h-7 bg-white border-2 border-[#2E7D32] rounded-lg flex items-center justify-center shadow-xs hover:bg-emerald-50 transition-colors overflow-hidden">
                <span className="text-[#2E7D32] font-black text-[11px] tracking-wider leading-none">CASH</span>
              </div>

            </div>

            {/* Legal / Policy Links */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 text-slate-500 font-medium text-[11px]">
              <Link href="/help" className="hover:text-slate-950 transition-colors">Help & FAQs</Link>
              <Link href="/buyer-protection" className="hover:text-slate-950 transition-colors">Buyer Protection</Link>
              <Link href="/sell" className="hover:text-slate-950 font-bold text-amber-700 transition-colors">Sell on Waw</Link>
              <Link href="/refund-policy" className="hover:text-slate-950 transition-colors">7-Day Returns</Link>
              <Link href="/privacy" className="hover:text-slate-950 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-950 transition-colors">Terms of Service</Link>
            </div>
          </div>

          {/* Row 2: Regulatory Company Registration Details */}
          <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center lg:text-left flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              WAW TECHNOLOGIES (SMC-PRIVATE) LIMITED • NTN: 8945201-3 • 100% Secure Checkout & Escrow Protection • SECP Reg. # 0192847
            </div>
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span>National Courier Logistics: PostEx, TCS Express, Leopards, Trax</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
