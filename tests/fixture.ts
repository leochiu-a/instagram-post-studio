import { parseMarkdown } from "../src/lib/markdown";
import type { CtaSlide } from "../src/lib/types";

/** 用 data URL 當測試圖：不必先上傳就能驗版位，也不會有 CORS 問題 */
export function solidImage(hex: string, width = 600, height = 300) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hex}"/></svg>`;
  // 括號要一起編碼：Markdown 的 ![](...) 是用 ")" 收尾的，留一個在網址裡就切錯了
  const encoded = encodeURIComponent(svg).replaceAll("(", "%28").replaceAll(")", "%29");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export const COVER_IMAGE = "#f97316";
export const CONTENT_IMAGE = "#22c55e";
export const CTA_IMAGE = "#a855f7";

/** 長內文用來確認圖片不會被擠掉，也不會壓到 SWIPE 膠囊 */
const LONG_BODY = Array.from(
  { length: 14 },
  (_, i) => `第 ${i + 1} 行用來把內文撐長的測試文字，看看版位還守不守得住。`,
).join("\n");

/**
 * 一篇貼文的正文，跟磁碟上那個 .md 檔一模一樣 —— 版位就寫在圖片的 alt 裡。
 * 測試不再自己組 Slide 陣列：頁面是從這份文字解析出來的，手寫一份等於在驗
 * 一個實際上不存在的狀態。
 */
export const BODY = `# 封面大標測試

![banner](${solidImage(COVER_IMAGE)})

## 橫幅版位

![banner](${solidImage(CONTENT_IMAGE)})

這一行有 \`vp dev\` 這段程式碼，要出現淺色 chip。

## 正方形版位

![square](${solidImage(CONTENT_IMAGE, 600, 600)})

短內文。

## 超長內文

![banner](${solidImage(CONTENT_IMAGE)})

${LONG_BODY}
`;

/** 結尾頁 Markdown 表達不了，走 frontmatter */
export const CTA: Partial<CtaSlide> = {
  subhead: "分享給你的朋友吧！",
  headline: "這篇貼文對你有幫助嗎？",
  stats: ["560", "204", "427", "318"],
  imageUrl: solidImage(CTA_IMAGE),
};

/**
 * 這篇貼文會被解析成的頁面。id 是 parseMarkdown 依順序給的（p1、p2……），
 * 所以測試要指某一張時用 SLIDES[n].id，不要寫死。
 */
export const SLIDES = parseMarkdown(BODY, CTA);

export const TITLE = "版型驗證";
export const HANDLE = "@leo.web.dev";
export const TIMESTAMP = "3 min ago";
