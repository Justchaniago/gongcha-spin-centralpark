import type { Metadata, Viewport } from "next";
import { Vidaloka, Public_Sans } from "next/font/google";
import "./globals.css";

const vidaloka = Vidaloka({
  variable: "--font-vidaloka",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gong cha Central Park — Grand Opening",
  description: "Claim your exclusive Gong cha Central Park Grand Opening voucher.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${vidaloka.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F6F1E6] text-[#382F2D] selection:bg-[#F1D09F] selection:text-[#C10230]">
        {children}
      </body>
    </html>
  );
}
