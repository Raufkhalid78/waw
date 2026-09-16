import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell on Waw - Become a Seller",
  description: "Reach customers across Pakistan - apply to sell on Waw's verified marketplace.",
};

export default function sellLayout({ children }: { children: React.ReactNode }) {
  return children;
}
