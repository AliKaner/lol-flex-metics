import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoL Flex Metics — Flex 5v5 Analizi",
  description: "Takip ettiğin oyuncuların flex 5v5 maçlarını analiz et. Kim tanrı, kim besleme?",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
