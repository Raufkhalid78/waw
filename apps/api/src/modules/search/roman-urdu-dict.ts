/**
 * Roman Urdu & Colloquial Pakistani E-Commerce Phonetic Dictionary
 * Maps common Roman Urdu search terms to normalized catalog taxonomies and products.
 */

export const ROMAN_URDU_DICTIONARY: Record<string, string[]> = {
  // Clothing & Fashion
  jora: ["lawn", "suit", "unstitched", "dress"],
  suit: ["lawn", "unstitched", "kurta", "shalwar kameez"],
  kurta: ["mens kurta", "lawn suit", "stitched kurta"],
  kapray: ["lawn", "unstitched", "suits", "apparel"],
  khaddi: ["khaadi", "lawn", "handloom"],
  khadi: ["khaadi", "lawn", "cotton"],
  chunri: ["lawn", "dupatta", "traditional wear"],
  dupatta: ["lawn", "chiffon dupatta", "silk"],

  // Footwear
  joti: ["peshawari", "chappal", "khussa", "leather shoes", "footwear"],
  joota: ["shoes", "peshawari", "chappal", "leather footwear"],
  jootay: ["shoes", "peshawari", "chappal", "footwear"],
  chappal: [
    "peshawari chappal",
    "norozi chappal",
    "kaptaan chappal",
    "chappal",
    "peshawari",
    "norozi",
    "kaptaan",
    "kheri",
    "sandals",
    "footwear",
  ],
  chapal: ["chappal", "peshawari", "norozi", "kheri"],
  kheri: ["peshawari", "chappal", "norozi", "leather"],
  khussa: ["traditional khussa", "leather footwear", "shoes"],
  norozi: ["norozi", "peshawari", "chappal", "leather", "mustard leather"],
  peshawari: ["peshawari", "chappal", "norozi", "leather", "footwear"],
  kaptaan: ["kaptaan", "peshawari", "chappal", "footwear"],

  // Leather & Accessories
  batwa: ["leather wallet", "bifold wallet", "card holder", "wallet"],
  wallet: ["leather wallet", "card holder", "pure leather", "wallet"],
  chamra: ["leather", "pure cow leather", "leather wallet", "leather bag"],
  paiti: ["leather belt", "pure cow leather belt", "belt"],
  belt: ["leather belt", "formal belt", "belt"],
  bag: ["leather bag", "handbag", "crossbody bag", "laptop bag"],

  // Electronics & Gadgets
  mobile: ["smartphones", "mobiles", "phone", "cell phone"],
  phone: ["smartphones", "mobiles", "phone", "wireless earbuds"],
  airpods: ["airpods", "earbuds", "anc", "wireless", "earphones", "apple"],
  earphone: ["airpods", "wireless earbuds", "bluetooth earphones", "earphones"],
  earbuds: ["airpods", "airpods pro", "wireless earbuds", "anc earbuds", "earbuds"],
  handsfree: ["earbuds", "airpods", "earphones", "handsfree"],
  ghari: ["smart watch", "amoled watch", "fitness tracker", "watch"],
  watch: ["smart watch", "amoled watch", "wrist watch", "watch"],
  charger: ["fast charger", "type-c cable", "power bank", "65w gan charger"],
  powerbank: ["power bank", "portable battery", "20000mah"],
  taar: ["usb cable", "type-c charging cable", "cable"],

  // Fragrances & Lifestyle
  ittar: ["royal oud attar", "perfume", "non-alcoholic fragrance", "attar"],
  attar: ["royal oud attar", "kasturi attar", "amber oodh", "attar"],
  khushboo: ["attar", "perfume", "fragrance"],
  surma: ["traditional surma", "kajal"],

  // Sports (Sialkot Export)
  football: ["sialkot match football", "hand-stitched football", "fifa grade"],
  ball: ["match football", "cricket tape ball", "ball"],
  balla: ["cricket bat", "english willow bat", "tape ball bat", "bat"],
  bat: ["english willow bat", "cricket bat", "bat"],
  dastanay: ["boxing gloves", "batting gloves", "gloves"],
  gloves: ["boxing gloves", "leather sports gloves", "gloves"],
};

/**
 * Expands a raw search query with synonyms from Roman Urdu dictionary.
 */
export function expandRomanUrduQuery(rawQuery: string): string[] {
  const normalized = rawQuery.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  const synonyms = new Set<string>();

  synonyms.add(normalized);

  for (const word of words) {
    if (ROMAN_URDU_DICTIONARY[word]) {
      ROMAN_URDU_DICTIONARY[word].forEach((syn) => synonyms.add(syn));
    }
  }

  return Array.from(synonyms);
}
