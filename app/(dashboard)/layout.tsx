import type { Metadata } from "next";
import "../globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "KVJ Analytics - Financial Management",
  description: "Financial Management System for Indian IT Services and Training Businesses",
};

import { auth } from "@/auth";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = (session?.user as any)?.role || "USER";

  return (
    <DashboardLayoutClient user={session?.user} userRole={role}>
      {children}
    </DashboardLayoutClient>
  );
}
