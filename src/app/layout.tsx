import type { Metadata } from "next";
import { Geist, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** 貼文版型專用字體，對應 Canva 版型裡的中文無襯線 */
const slideFont = Noto_Sans_TC({
  variable: "--font-slide",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IG Post Studio",
  description: "把 Canva 版型搬進瀏覽器，輸入內容就能匯出 1080×1350 的 Instagram 貼文。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${slideFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
