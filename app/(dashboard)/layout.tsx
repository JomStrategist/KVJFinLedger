import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinLedger India - Financial Management",
  description: "Financial Management System for Indian IT Services and Training Businesses",
};

import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = (session?.user as any)?.role || "USER";

  return (
    <div className={`${inter.className} flex h-screen bg-theme-bg text-theme-text`}>
      <Sidebar userRole={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-theme-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
