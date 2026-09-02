import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { AdminProvider } from "@/components/AdminProvider";
import { ClientAuthGuard } from "@/components/ClientAuthGuard";

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
        <AdminProvider>
          <ClientAuthGuard tokenKey="admin_token">
            <div className="flex h-screen overflow-hidden bg-gray-50">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </ClientAuthGuard>
        </AdminProvider>
      </body>
    </html>
  );
}
