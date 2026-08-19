import type { Post, Slide } from "../src/lib/types";

/** 用 data URL 當測試圖：跟真實上傳一樣不會有 CORS 問題 */
export function solidImage(hex: string, width = 600, height = 300) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const COVER_IMAGE = "#f97316";
export const CONTENT_IMAGE = "#22c55e";
export const CTA_IMAGE = "#a855f7";

/** 長內文用來確認圖片不會被擠掉，也不會壓到 SWIPE 膠囊 */
const LONG_BODY = Array.from(
  { length: 14 },
  (_, i) => `第 ${i + 1} 行用來把內文撐長的測試文字，看看版位還守不守得住。`,
).join("\n");

export const SLIDES: Slide[] = [
  {
    id: "t1",
    kind: "cover",
    title: "封面大標測試",
    imageUrl: solidImage(COVER_IMAGE),
    imageShape: "banner",
  },
  {
    id: "t2",
    kind: "content",
    badge: "01",
    heading: "橫幅版位",
    body: "這一行有 `vp dev` 這段程式碼，要出現淺色 chip。",
    imageUrl: solidImage(CONTENT_IMAGE),
    imageShape: "banner",
  },
  {
    id: "t3",
    kind: "content",
    badge: "02",
    heading: "正方形版位",
    body: "短內文。",
    imageUrl: solidImage(CONTENT_IMAGE, 600, 600),
    imageShape: "square",
  },
  {
    id: "t4",
    kind: "content",
    badge: "03",
    heading: "超長內文",
    body: LONG_BODY,
    imageUrl: solidImage(CONTENT_IMAGE),
    imageShape: "banner",
  },
  {
    id: "t5",
    kind: "cta",
    subhead: "分享給你的朋友吧！",
    headline: "這篇貼文對你有幫助嗎？",
    stats: ["560", "204", "427", "318"],
    imageUrl: solidImage(CTA_IMAGE),
  },
];

export const POST: Post = {
  id: "t",
  title: "版型驗證",
  handle: "@leo.web.dev",
  timestamp: "3 min ago",
  theme: "dark",
  slides: SLIDES,
  draft: "",
};

export const STORAGE_KEY = "ig-post-studio:posts:v1";

export const SEED = JSON.stringify({ posts: { [POST.id]: POST }, order: [POST.id] });
