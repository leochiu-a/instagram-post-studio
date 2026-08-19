export type ThemeName = "dark" | "light";

export type ImageShape = "banner" | "square" | "none";

export type Slide =
  | {
      id: string;
      kind: "cover";
      title: string;
      imageUrl: string;
      imageShape: ImageShape;
    }
  | {
      id: string;
      kind: "content";
      /** 左上角的頁碼，例如 "01"。空字串則不顯示。 */
      badge: string;
      heading: string;
      /** 支援 **粗體**、`程式碼` 與 "- " 開頭的項目符號。 */
      body: string;
      imageUrl: string;
    }
  | {
      id: string;
      kind: "cta";
      subhead: string;
      headline: string;
      stats: [string, string, string, string];
      imageUrl: string;
    };

export interface Post {
  id: string;
  /** 清單上顯示的名稱，也決定匯出的檔名 */
  title: string;
  handle: string;
  timestamp: string;
  theme: ThemeName;
  slides: Slide[];
  /** 這篇自己的 Markdown 草稿 */
  draft: string;
}

let seq = 0;

/**
 * 單調遞增的 id。刻意不用 Math.random()：初始範例在伺服器與瀏覽器
 * 都會各跑一次 parseMarkdown，隨機 id 會造成 hydration mismatch。
 */
export const newId = () => `n${++seq}`;
