import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";

const plusJakartaSans = localFont({
  src: "./fonts/plus-jakarta-sans.woff2",
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono.woff2",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: "FinLedger — Financial Management ERP",
  description: "Comprehensive Financial Management System for Business Accounting, Invoicing, Tax & Financial Reporting",
  icons: {
    icon: [
      { url: "/finledger-icon.png", type: "image/png" },
    ],
    shortcut: "/finledger-icon.png",
    apple: "/finledger-icon.png",
  },
  openGraph: {
    title: "FinLedger — Financial Management ERP",
    description: "Comprehensive Financial Management System for Business Accounting, Invoicing, Tax & Financial Reporting",
    images: [
      {
        url: "/finledger-icon.png",
        width: 512,
        height: 512,
        alt: "FinLedger Logo Icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "FinLedger — Financial Management ERP",
    description: "Comprehensive Financial Management System for Business Accounting, Invoicing, Tax & Financial Reporting",
    images: ["/finledger-icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${plusJakartaSans.className}`}>
      <body className="bg-theme-bg text-theme-text antialiased font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

