import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { SITE_NAME, SITE_OFFER, SITE_TAGLINE } from "@/lib/constants";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_OFFER,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://boro.proektmap.ru"
  ),
  other: {
    "theme-color": "#ffffff",
  },
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
