import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account - Waw",
  description: "Manage your orders, addresses and account settings on Waw.",
};

export default function accountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
