import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Products - Waw",
  description: "Search thousands of verified products from Pakistan's best sellers on Waw.",
};

export default function searchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
