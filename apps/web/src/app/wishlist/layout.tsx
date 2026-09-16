import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Items - Waw",
  description: "Products you saved for later on Waw - Pakistan's premium marketplace.",
};

export default function wishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
