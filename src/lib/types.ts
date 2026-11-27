export type ThemeName = "dark" | "light";

export type Slide =
  | {
      id: string;
      kind: "cover";
      title: string;
      /** 空字串就是沒有圖。圖一律是橫幅：內容區滿寬、高度隨圖片比例 */
      imageUrl: string;
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

/** 結尾 CTA 頁。Markdown 表達不了它，序列化時走 frontmatter（見 post-file.ts）。 */
export type CtaSlide = Extract<Slide, { kind: "cta" }>;

export type Post = {
  /** 檔名（不含 .md），同時是網址上的 slug。建立時決定，之後改標題也不會變。 */
  id: string;
  /** 清單上顯示的名稱，也決定匯出的檔名 */
  title: string;
  handle: string;
  timestamp: string;
  theme: ThemeName;
  /** 由 draft 解析出來的頁面（見 markdown.ts）。存檔時不寫進去，讀檔時再算一次。 */
  slides: Slide[];
  /** 這篇的 Markdown 正文 —— 也就是磁碟上那個檔案 frontmatter 底下的全部內容 */
  draft: string;
};

let seq = 0;

/**
 * 單調遞增的 id。刻意不用 Math.random()：初始範例在伺服器與瀏覽器
 * 都會各跑一次 parseMarkdown，隨機 id 會造成 hydration mismatch。
 */
export const newId = () => `n${++seq}`;

/** 頁面類型的中文名稱。頂列的讀數與逐頁編輯器共用，不要各寫一份 */
export const KIND_LABEL: Record<Slide["kind"], string> = {
  cover: "封面",
  content: "內頁",
  cta: "結尾 CTA",
};
