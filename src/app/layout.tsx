import type { Metadata } from "next";
import { Urbanist, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Brightloop — Recurring revenue, on autopilot",
  description: "Subscription Management System for recurring billing, contracts, and invoicing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${urbanist.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F7F7F5] text-[#0E0E0E]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
