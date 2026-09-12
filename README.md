# Waw (واو) — Premium Marketplace Pakistan

> **"واو"** (Waw): Sounds like "Wow" (the customer experience) and represents "And" in Arabic/Urdu (connecting buyers and sellers).

---

## 🏛️ System Architecture

```
waw/
├── apps/
│   ├── web/          ← Next.js 14 Buyer Storefront (SSR, Urdu/EN, Free Delivery tracker)
│   ├── admin/        ← Next.js 14 Custom Admin Control Center (KYC, GMV, COD Remittance)
│   ├── api/          ← Express.js Core Backend (Supabase, Bank Alfalah APG, PostEx, WhatsApp, Typesense)
│   └── mobile/       ← Flutter iOS & Android App (BLoC, Urdu RTL, Offline Cart)
├── packages/
│   ├── types/        ← Shared TypeScript Types, Enums & Pricing Calculation Engine
│   └── config/       ← Shared Configs
├── docker-compose.yml ← Typesense, Redis & Postgres
└── nginx.conf         ← Production Reverse Proxy & SSL Routing
```

---

## 💳 Payment & Delivery Strategy (Pakistan)

| Channel                        | Method                                 | Policy & Pricing                                              |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| **Alfa Wallet (Bank Alfalah)** | REST API — **onsite checkout**, no redirect | Buyer enters wallet number + OTP on waw.com.pk                |
| **Alfalah Bank Account**       | REST API — **onsite checkout**, no redirect | Buyer enters account number + OTAC on waw.com.pk              |
| **Alfa Card (Visa/Mastercard)** | APG hosted page (PCI-mandated redirect) | Redirect to Bank Alfalah secure checkout, then auto-return    |
| **Raast P2M QR**              | SBP instant payment — scan & pay       | Dynamic QR generated at checkout                               |
| **Cash on Delivery (COD)**    | PostEx / TCS Express                   | **+PKR 100 Handling Surcharge** (offsets courier return risk) |
| **Delivery Promotion**         | Nationwide Delivery                    | **FREE Delivery on all orders over PKR 5,000**               |

---

## 🚀 Quick Start Guide

### 1. Start Backing Services (Docker)

```bash
docker compose up -d
```

_Starts **Typesense** on port 8108, **Redis** on port 6379, and **Postgres** on port 5432._

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Run Backend API

```bash
cd apps/api
npm install
npm run dev
# Running on http://localhost:4000
```

### 4. Run Buyer Storefront (Next.js)

```bash
cd apps/web
npm install
npm run dev
# Running on http://localhost:3000
```

### 5. Run Admin Control Center (Next.js)

```bash
cd apps/admin
npm install
npm run dev
# Running on http://localhost:3001
```

### 6. Run Flutter Mobile App

```bash
cd apps/mobile
flutter run
```

---

## 🔒 Security & SBP Compliance

- **SBP PSP Regulation:** Bank Alfalah APG (PCI-DSS certified) handles all cardholder and wallet data securely — card data never touches Waw servers.
- **WhatsApp Direct Receipt:** Transaction receipts and courier live tracking are dispatched via WhatsApp.
- **Data Integrity:** Supabase PostgreSQL with Row Level Security (RLS) ensures sellers only access their respective inventory and payout ledgers.
