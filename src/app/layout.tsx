import type { Metadata } from "next";
import { Anton, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: ["400"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Gong Cha Central Park — Grand Opening",
  description: "Claim your exclusive Gong Cha Central Park Grand Opening voucher.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${anton.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F5F2E8] text-[#111111]">
        {children}
      </body>
    </html>
  );
}
