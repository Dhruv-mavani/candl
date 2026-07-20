import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Candl | NFT liquidity provider",
  description: "A professional, instant, and data-rich trading experience on Solana.",
};

import { AppLayout } from "@/components/layout/AppLayout";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-foreground`}>
        <WalletContextProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </WalletContextProvider>
      </body>
    </html>
  );
}
