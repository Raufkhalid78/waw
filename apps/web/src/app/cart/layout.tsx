import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart - Waw",
  description: "Review your cart and check out securely on Waw - Pakistan's premium marketplace.",
};

export default function cartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
