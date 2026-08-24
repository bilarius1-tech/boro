import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { DEFAULT_CITY, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${DEFAULT_CITY}`,
  description: SITE_TAGLINE,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://boro.proektmap.ru"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
