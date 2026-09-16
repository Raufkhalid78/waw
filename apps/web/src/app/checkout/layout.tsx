import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Checkout - Waw",
  description: "Complete your order with COD, Raast or Bank Alfalah - secure checkout on Waw.",
};

export default function checkoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
