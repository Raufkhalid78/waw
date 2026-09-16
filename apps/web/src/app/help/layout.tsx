import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support - Waw",
  description: "Get help with orders, payments, returns and shipping on Waw.",
};

export default function helpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
