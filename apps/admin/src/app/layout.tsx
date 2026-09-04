import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { AdminProvider } from "@/components/AdminProvider";
import { ClientAuthGuard } from "@/components/ClientAuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Waw Admin — Control Center",
  description: "Admin dashboard for Waw marketplace management",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AdminProvider>
            <ClientAuthGuard>
              <AdminShell>{children}</AdminShell>
            </ClientAuthGuard>
          </AdminProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
