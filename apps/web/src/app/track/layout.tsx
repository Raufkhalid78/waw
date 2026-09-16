import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order - Waw",
  description: "Track your Waw order with just your order number and phone number.",
};

export default function trackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
