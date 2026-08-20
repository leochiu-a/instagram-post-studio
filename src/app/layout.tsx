import type { Metadata } from "next";
import { Archivo, JetBrains_Mono, Noto_Sans_TC } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** 介面正文：grotesk，數字與英文都走它 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

/** 標籤、頁碼、比例、檔名——所有「儀表板讀數」都是等寬 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

/** 貼文版型專用字體，對應 Canva 版型裡的中文無襯線；介面的中文也接在 Latin 之後用它 */
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
      className={`${archivo.variable} ${jetbrainsMono.variable} ${slideFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
