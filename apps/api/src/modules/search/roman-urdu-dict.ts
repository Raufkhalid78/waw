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
  joti: ["peshawari chappal", "khussa", "leather shoes"],
  joota: ["shoes", "peshawari chappal", "leather footwear"],
  chappal: [
    "peshawari chappal",
    "norozi chappal",
    "kaptaan chappal",
    "sandals",
  ],
  khussa: ["traditional khussa", "leather footwear"],
  norozi: ["norozi peshawari chappal", "mustard leather"],
  kaptaan: ["kaptaan chappal", "peshawari footwear"],

  // Leather & Accessories
  batwa: ["leather wallet", "bifold wallet", "card holder"],
  wallet: ["leather wallet", "card holder", "pure leather"],
  chamra: ["leather", "pure cow leather", "leather wallet", "leather bag"],
  paiti: ["leather belt", "pure cow leather belt"],
  belt: ["leather belt", "formal belt"],
  bag: ["leather bag", "handbag", "crossbody bag", "laptop bag"],

  // Electronics & Gadgets
  mobile: ["smartphones", "mobiles", "cell phone"],
  phone: ["smartphones", "mobiles", "wireless earbuds"],
  earphone: ["airpods", "wireless earbuds", "bluetooth earphones"],
  earbuds: ["airpods pro", "wireless earbuds", "anc earbuds"],
  ghari: ["smart watch", "amoled watch", "fitness tracker"],
  watch: ["smart watch", "amoled watch", "wrist watch"],
  charger: ["fast charger", "type-c cable", "power bank", "65w gan charger"],
  powerbank: ["power bank", "portable battery", "20000mah"],
  taar: ["usb cable", "type-c charging cable"],

  // Fragrances & Lifestyle
  ittar: ["royal oud attar", "perfume", "non-alcoholic fragrance"],
  attar: ["royal oud attar", "kasturi attar", "amber oodh"],
  khushboo: ["attar", "perfume", "fragrance"],
  surma: ["traditional surma", "kajal"],

  // Sports (Sialkot Export)
  football: ["sialkot match football", "hand-stitched football", "fifa grade"],
  ball: ["match football", "cricket tape ball"],
  balla: ["cricket bat", "english willow bat", "tape ball bat"],
  bat: ["english willow bat", "cricket bat"],
  dastanay: ["boxing gloves", "batting gloves"],
  gloves: ["boxing gloves", "leather sports gloves"],
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
