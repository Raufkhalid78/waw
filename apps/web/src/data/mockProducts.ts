import { SellerType } from '@waw/types';

export interface ProductDetail {
  productId: string;
  title: string;
  category: string;
  pricePkr: number;
  originalPricePkr: number;
  discountPercent: number;
  rating: number;
  reviewsCount: number;
  soldCount: number;
  isExpress: boolean;
  sellerType: SellerType;
  storeName: string;
  storeSlug: string;
  sellerCity: string;
  deliveryTime: string;
  images: string[];
  description: string;
  highlights: string[];
  specifications: Record<string, string>;
  inStock: boolean;
  stockCount: number;
  sku: string;
  reviews: {
    id: string;
    author: string;
    city: string;
    rating: number;
    date: string;
    comment: string;
    verifiedPurchase: boolean;
  }[];
}

export const CATALOG_PRODUCTS: ProductDetail[] = [
  {
    productId: 'prod_m1',
    title: 'Waw Signature Slim Bifold Pure Cow Leather Wallet',
    category: 'Leather & Footwear',
    pricePkr: 2499,
    originalPricePkr: 3600,
    discountPercent: 30,
    rating: 4.9,
    reviewsCount: 382,
    soldCount: 1420,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Official Hub',
    storeSlug: 'waw-official-hub',
    sellerCity: 'Islamabad Hub',
    deliveryTime: '4-5 Days (Waw Express)',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606503829059-86644f1c93a0?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Handcrafted from 100% full-grain top-tier cowhide leather by master artisans in Pakistan. Engineered for ultra-slim everyday carry without bulk, featuring RFID-blocking lining, 8 card slots, 2 hidden receipt compartments, and a dual currency pocket designed specifically for PKR currency notes.',
    highlights: [
      '100% Genuine Full-Grain Pakistani Cowhide',
      'Integrated Military-Grade RFID Blocking Technology',
      'Holds 8-10 Cards + Full Size PKR Currency Notes',
      'Hand-burnished edges with durable waxed nylon stitching',
      'Backed by Waw 2-Year Craftsmanship Warranty',
    ],
    specifications: {
      Material: '100% Full-Grain Cow Leather',
      Dimensions: '11.5 cm x 9.0 cm x 1.2 cm',
      Weight: '75 grams',
      'Card Slots': '8 dedicated card pockets',
      'Currency Compartments': '2 full-length bill sections',
      'RFID Protection': 'Yes (13.56 MHz frequency blocker)',
      Origin: 'Handmade in Lahore, Pakistan',
      Warranty: '2-Year Official Replacement Guarantee',
    },
    inStock: true,
    stockCount: 45,
    sku: 'WAW-LTH-WLT-001',
    reviews: [
      {
        id: 'rev_1',
        author: 'Hamza Tariq',
        city: 'Lahore',
        rating: 5,
        date: '3 days ago',
        comment: 'Received smoothly with Waw Express in 4 days! The leather aroma is 100% authentic and the stitching is superb.',
        verifiedPurchase: true,
      },
      {
        id: 'rev_2',
        author: 'Usman Ghani',
        city: 'Karachi',
        rating: 5,
        date: '1 week ago',
        comment: 'Very slim wallet that fits easily in pocket. Holds 5000 and 1000 PKR notes without bending them.',
        verifiedPurchase: true,
      },
      {
        id: 'rev_3',
        author: 'Bilal Ahmad',
        city: 'Islamabad',
        rating: 4.8,
        date: '2 weeks ago',
        comment: 'Premium packaging. Came in a nice wooden gift box with a leather care card. Highly recommended!',
        verifiedPurchase: true,
      },
    ],
  },
  {
    productId: 'prod_m2',
    title: 'Pro ANC Wireless Earbuds with Heavy Bass & 40h Battery',
    category: 'Mobiles & Tech',
    pricePkr: 3200,
    originalPricePkr: 4800,
    discountPercent: 33,
    rating: 4.8,
    reviewsCount: 1150,
    soldCount: 2190,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Lahore Tech Hub',
    storeSlug: 'lahore-tech-hub',
    sellerCity: 'Lahore',
    deliveryTime: '4-5 Days (Waw Express)',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Experience immersive studio sound with active noise cancellation (ANC up to -35dB) and deep punchy bass tailored for music lovers. Features Bluetooth 5.3 instant pairing, quad-mic ENC for crystal-clear WhatsApp and cellular calls, and an ergonomic sweatproof fit.',
    highlights: [
      'Active Noise Cancellation (ANC) with Transparency Ambient Mode',
      '13mm Titanium Dynamic Bass Drivers',
      'Up to 40 Hours Combined Playtime with USB-C Fast Charging',
      'IPX5 Sweat & Water Resistance for Gym & Running',
      'Ultra Low Latency Gaming Mode (45ms)',
    ],
    specifications: {
      'Bluetooth Version': '5.3 (10m stable range)',
      'Battery Life': '8 hours per charge, 40 hours with case',
      'Charging Time': '1 hour (10 min charge = 2 hours playtime)',
      'Noise Cancellation': '-35dB Hybrid Active Noise Cancellation',
      Microphones: '4-Mic Environmental Noise Cancellation (ENC)',
      'Waterproof Rating': 'IPX5 Sweat & Splash Proof',
      Compatibility: 'Android, iOS, Windows, Mac',
      Warranty: '6 Months Local Replacement Warranty',
    },
    inStock: true,
    stockCount: 82,
    sku: 'LTH-AUD-EP-502',
    reviews: [
      {
        id: 'rev_201',
        author: 'Zubair Farooq',
        city: 'Rawalpindi',
        rating: 5,
        date: 'Yesterday',
        comment: 'Bass is unbelievable for this price! Call quality in traffic is very clear thanks to ENC.',
        verifiedPurchase: true,
      },
      {
        id: 'rev_202',
        author: 'Ayesha Siddiqui',
        city: 'Karachi',
        rating: 4.8,
        date: '5 days ago',
        comment: 'Pairs instantly with my iPhone. Battery lasted the entire 4-day trip on a single charge.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    productId: 'prod_m3',
    title: 'Handmade Traditional Norozi Peshawari Chappal (Pure Mustard Leather)',
    category: 'Leather & Footwear',
    pricePkr: 3800,
    originalPricePkr: 5200,
    discountPercent: 27,
    rating: 5.0,
    reviewsCount: 429,
    soldCount: 890,
    isExpress: false,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Khyber Artisans',
    storeSlug: 'khyber-artisans',
    sellerCity: 'Peshawar',
    deliveryTime: '7-9 Days (Standard)',
    images: [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Authentic Peshawari Norozi double-sole chappal hand-crafted in Namak Mandi, Peshawar. Crafted from premium full-grain cowhide upper with traditional soft leather insole and recycled tyre rubber sole engineered for unmatched longevity, comfort, and traditional style.',
    highlights: [
      'Original Peshawar Namak Mandi Craftsmanship',
      'Double Tyre Rubber Sole for Lifetime Durability',
      'Cushioned arch support with soft goat leather insole',
      'Hand-stitched reinforced welt with heavy gauge thread',
      'Traditional buckle strap with customizable fit',
    ],
    specifications: {
      'Upper Material': '100% Full-Grain Mustard Cow Leather',
      'Sole Material': 'Durable Recycled Tyre Rubber',
      Insole: 'Soft Padded Goat Leather',
      Stitching: 'Heavy Duty Waxed Thread Hand-Sewn',
      Occasion: 'Eid, Weddings, Friday Prayers & Casual',
      Origin: 'Peshawar, Khyber Pakhtunkhwa',
      Warranty: '1-Year Sole Separation Warranty',
    },
    inStock: true,
    stockCount: 28,
    sku: 'KHY-SH-NOR-003',
    reviews: [
      {
        id: 'rev_301',
        author: 'Farhan Afridi',
        city: 'Peshawar',
        rating: 5,
        date: '2 days ago',
        comment: 'Asli Peshawari chappal! Sole is heavy and strong, fits Shalwar Kameez perfectly.',
        verifiedPurchase: true,
      },
      {
        id: 'rev_302',
        author: 'Kamran Malik',
        city: 'Faisalabad',
        rating: 5,
        date: '1 week ago',
        comment: 'Extremely comfortable for standing all day. Size guide was 100% accurate.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    productId: 'prod_m4',
    title: 'Ultra Smart Fitness Watch 2026 (AMOLED Display & Bluetooth Calling)',
    category: 'Smart Watches',
    pricePkr: 4999,
    originalPricePkr: 7999,
    discountPercent: 37,
    rating: 4.7,
    reviewsCount: 512,
    soldCount: 1680,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Electronics Hub',
    storeSlug: 'waw-electronics-hub',
    sellerCity: 'Lahore Hub',
    deliveryTime: '4-5 Days (Waw Express)',
    images: [
      'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Next-generation smart watch featuring a brilliant 1.96-inch HD AMOLED Always-On display, crisp speaker & mic for direct Bluetooth calling, 120+ sports workout modes, SpO2 blood oxygen tracking, 24/7 heart rate monitoring, and 10-day ultra battery life.',
    highlights: [
      '1.96" HD AMOLED Curved Edge Display (500 Nits Sunlight Visible)',
      'Direct Bluetooth Calling with Built-in HD Speaker & Mic',
      'Health Tracking: Heart Rate, SpO2, Sleep Stages, Stress Monitoring',
      '120+ Dedicated Sports Modes with Auto-Detection',
      '10-Day Battery Life on Single Magnetic Charge',
    ],
    specifications: {
      Display: '1.96" AMOLED (410x502 resolution, Always-On)',
      Battery: '380mAh (10 days regular, 25 days standby)',
      Connectivity: 'Bluetooth 5.2 Low Energy',
      Sensors: 'Optical HR, PPG SpO2, 3-Axis Accelerometer',
      Compatibility: 'Android 5.0+ and iOS 10.0+',
      Waterproof: 'IP68 3ATM Dust & Water Resistant',
      Warranty: '1-Year Official Waw Replacement Warranty',
    },
    inStock: true,
    stockCount: 60,
    sku: 'WAW-SMW-AM-2026',
    reviews: [
      {
        id: 'rev_401',
        author: 'Saad Mehmood',
        city: 'Islamabad',
        rating: 5,
        date: '4 days ago',
        comment: 'Display is super bright even under direct sunlight in Islamabad. Calling is very clear.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    productId: 'prod_m5',
    title: 'Original Sialkot Export Match Football (FIFA Pro Thermally Bonded)',
    category: 'Sialkot Sports',
    pricePkr: 2800,
    originalPricePkr: 4200,
    discountPercent: 33,
    rating: 4.9,
    reviewsCount: 290,
    soldCount: 940,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Sialkot Sports Direct',
    storeSlug: 'sialkot-sports-direct',
    sellerCity: 'Sialkot',
    deliveryTime: '4-5 Days (Waw Express)',
    images: [
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Official match-grade Size 5 football made in Sialkot, Pakistan. Built using seamless thermal bonding technology that prevents water absorption, ensuring perfect spherical balance, true flight trajectory, and maximum responsive touch on turf or grass.',
    highlights: [
      'Made in Sialkot, Pakistan (World Capital of Footballs)',
      'Thermally Bonded Seamless Surface for Zero Water Ingress',
      'Textured Micro-Fiber PU Skin for Superior Grip & Swerve',
      'High-Grade Butyl Bladder with 60-Day Air Retention',
    ],
    specifications: {
      Size: 'Official Standard Size 5 (Weight: 420-445g)',
      Construction: 'Thermal Bonding (No Stitches)',
      Material: '1.2mm Textured Microfiber Polyurethane',
      Bladder: 'Reinforced Taiwan Butyl Rubber',
      Ground: 'Grass, Artificial Turf & Concrete Grounds',
      Origin: 'Sialkot, Punjab, Pakistan',
    },
    inStock: true,
    stockCount: 90,
    sku: 'SLK-FTB-PRO-005',
    reviews: [
      {
        id: 'rev_501',
        author: 'Ali Raza',
        city: 'Lahore',
        rating: 5,
        date: '1 week ago',
        comment: 'Same quality as balls used in international tournaments. Zero water absorption in rainy matches.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    productId: 'prod_m6',
    title: 'Designer 3-Piece Printed Summer Lawn Suit with Chiffon Dupatta',
    category: "Women's Lawn",
    pricePkr: 4500,
    originalPricePkr: 6500,
    discountPercent: 31,
    rating: 4.8,
    reviewsCount: 680,
    soldCount: 1950,
    isExpress: true,
    sellerType: SellerType.FIRST_PARTY,
    storeName: 'Waw Fashion Mall',
    storeSlug: 'waw-fashion-mall',
    sellerCity: 'Karachi Hub',
    deliveryTime: '4-5 Days (Waw Express)',
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Premium breathable 100% fine cotton lawn 3-piece unstitched collection. Features intricate digital prints with embroidered neckline patch, printed cambric trousers, and a lightweight printed chiffon dupatta designed for breezy elegance in Pakistani summers.',
    highlights: [
      '100% Super-Fine 80x80 Combed Cotton Lawn',
      'Includes Luxury Printed Chiffon Dupatta (2.5m)',
      'Digital Printed Shirt with Embroidered Front Panel',
      'Dyed Soft Cambric Cotton Trouser (2.5m)',
      '100% Color Fastness Guarantee',
    ],
    specifications: {
      Fabric: 'Super Combed Cotton Lawn + Chiffon',
      Pieces: '3 Piece Unstitched (Shirt, Dupatta, Trouser)',
      'Shirt Length': '3.0 Meters Digital Printed + Embroidery',
      'Dupatta Length': '2.5 Meters Printed Chiffon',
      'Trouser Length': '2.5 Meters Dyed Cambric',
      Season: 'Summer / Festive 2026',
      Origin: 'Karachi, Pakistan',
    },
    inStock: true,
    stockCount: 110,
    sku: 'WAW-LWN-FST-306',
    reviews: [
      {
        id: 'rev_601',
        author: 'Sana Fatima',
        city: 'Multan',
        rating: 5,
        date: '3 days ago',
        comment: 'Fabric is extremely soft and breathable for Multan heat. Colors remained bright after washing.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    productId: 'prod_m7',
    title: '65W GaN Fast Charger Multi-Port (Type-C PD + USB-A Quick Charge)',
    category: 'Power & Chargers',
    pricePkr: 2650,
    originalPricePkr: 3900,
    discountPercent: 32,
    rating: 4.8,
    reviewsCount: 340,
    soldCount: 1120,
    isExpress: true,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Lahore Tech Hub',
    storeSlug: 'lahore-tech-hub',
    sellerCity: 'Lahore',
    deliveryTime: '4-5 Days (Waw Express)',
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Ultra-compact Gallium Nitride (GaN III) high-speed wall charger capable of powering laptops, MacBooks, iPads, Samsung, and iPhones simultaneously at full 65W speed. Built-in smart heat dissipation and surge protection for Pakistani power fluctuations.',
    highlights: [
      'Gallium Nitride (GaN) III Technology — 50% Smaller Size',
      'Dual Port: 1x 65W USB-C Power Delivery + 1x 18W USB-A Quick Charge',
      'Charges MacBook Pro 13" from 0 to 100% in 1.8 Hours',
      'Multi-protection against over-voltage, temperature surges & short circuits',
    ],
    specifications: {
      Output: '65W Max (PPS, PD 3.0, QC 4.0+)',
      Input: '100-240V ~ 50/60Hz 1.5A',
      Ports: '1x USB-C + 1x USB-A',
      Dimensions: '5.2 cm x 3.6 cm x 3.6 cm',
      Compatibility: 'Laptops, MacBooks, iPhone, Galaxy, Pixel, Tablets',
      Warranty: '1-Year Replacement Warranty',
    },
    inStock: true,
    stockCount: 75,
    sku: 'LTH-PWR-GAN-065',
    reviews: [
      {
        id: 'rev_701',
        author: 'Danish Khan',
        city: 'Karachi',
        rating: 5,
        date: '5 days ago',
        comment: 'Replaced both my laptop charger and phone charger with this single tiny adapter. Doesn’t heat up.',
        verifiedPurchase: true,
      },
    ],
  },
  {
    productId: 'prod_m8',
    title: 'Artisan Pure Oudh & Amber Attar Perfume Oil (12ml Non-Alcoholic)',
    category: 'Fragrances & Attar',
    pricePkr: 1950,
    originalPricePkr: 2800,
    discountPercent: 30,
    rating: 4.9,
    reviewsCount: 210,
    soldCount: 670,
    isExpress: false,
    sellerType: SellerType.THIRD_PARTY,
    storeName: 'Royal Fragrances',
    storeSlug: 'royal-fragrances',
    sellerCity: 'Karachi',
    deliveryTime: '7-9 Days (Standard)',
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      '100% pure, alcohol-free concentrated perfume oil extracted from aged Cambodian agarwood and royal amber. Delivers an opulent, long-lasting oriental sillage that stays vibrant on garments for over 48 hours.',
    highlights: [
      '100% Pure Concentrated Perfume Oil (Non-Alcoholic)',
      'Long Lasting Projection: 24h on Skin, 48h on Clothes',
      'Rich Woody, Amber & Warm Spicy Notes',
      'Presented in a Luxury Crystal Glass Bottle with Dip Applicator',
    ],
    specifications: {
      Volume: '12 ml Concentrated Oil',
      'Fragrance Type': 'Oriental Woody Amber',
      Alcohol: '0% (Halal & Non-Alcoholic)',
      Gender: 'Unisex',
      Origin: 'Karachi, Pakistan',
    },
    inStock: true,
    stockCount: 40,
    sku: 'ROY-PRF-OUD-012',
    reviews: [
      {
        id: 'rev_801',
        author: 'Muneeb Sheikh',
        city: 'Gujranwala',
        rating: 5,
        date: '6 days ago',
        comment: 'MashAllah heavenly fragrance. Very rich and stayed on my Kurta even after 2 days.',
        verifiedPurchase: true,
      },
    ],
  },
];

export function getProductById(id: string): ProductDetail | undefined {
  return CATALOG_PRODUCTS.find((p) => p.productId === id);
}

export function getRelatedProducts(category: string, currentId: string): ProductDetail[] {
  const sameCat = CATALOG_PRODUCTS.filter((p) => p.category === category && p.productId !== currentId);
  if (sameCat.length >= 3) return sameCat;
  return CATALOG_PRODUCTS.filter((p) => p.productId !== currentId).slice(0, 4);
}
