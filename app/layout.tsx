import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
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

