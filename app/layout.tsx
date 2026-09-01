import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KVJ Analytics - Financial Management System",
  description: "Financial Management System for Indian IT Services and Training Businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-theme-bg text-theme-text antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
