import { newId, type CtaSlide, type Slide } from "./types";

const CTA_DEFAULTS = {
  subhead: "分享給你的朋友吧！",
  headline: "這篇貼文對你有幫助嗎？",
  stats: ["560", "204", "427", "318"] as [string, string, string, string],
  imageUrl: "",
};

/**
 * overrides 是逐欄位套的，不是整個 spread 進來 —— frontmatter 少一個欄位時
 * 傳進來的是 undefined，spread 會拿它蓋掉預設值，結尾頁就會少掉那四個數字。
 */
export const makeCtaSlide = (id = newId(), overrides?: Partial<CtaSlide>): CtaSlide => ({
  id,
  kind: "cta",
  subhead: overrides?.subhead ?? CTA_DEFAULTS.subhead,
  headline: overrides?.headline ?? CTA_DEFAULTS.headline,
  stats: overrides?.stats ?? CTA_DEFAULTS.stats,
  imageUrl: overrides?.imageUrl ?? CTA_DEFAULTS.imageUrl,
});

/** alt 不讀：圖只有一種版位，以前寫在 alt 裡的 banner 之類就當成一般的 alt */
const IMAGE_LINE = /^!\[[^\]]*\]\(([^)]+)\)\s*$/;

/**
 * 把一份 Markdown 切成貼文頁面：
 *   `# 標題`         → 封面
 *   `## 標題`        → 一張內頁（頁碼自動編號 01、02……）
 *   `![](url)`       → 該頁的圖片
 * 最後自動補一張結尾 CTA 頁 —— 它的欄位 Markdown 表達不了，所以由 cta 帶進來。
 */
export function parseMarkdown(source: string, cta?: Partial<CtaSlide>): Slide[] {
  const slides: Slide[] = [];
  // 解析出來的 id 只跟內容順序有關，伺服器與瀏覽器算出的結果必然一致
  let n = 0;
  const nextId = () => `p${++n}`;
  let current: Slide | null = null;
  const buffer: string[] = [];

  const flush = () => {
    if (!current) return;
    const body = buffer.join("\n").replace(/^\n+|\n+$/g, "");
    if (current.kind === "content") current.body = body;
    slides.push(current);
    buffer.length = 0;
  };

  for (const raw of source.split("\n")) {
    const line = raw.replace(/\s+$/, "");

    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1) {
      flush();
      current = {
        id: nextId(),
        kind: "cover",
        title: h1[1].trim(),
        imageUrl: "",
      };
      continue;
    }

    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      flush();
      const nth = slides.filter((s) => s.kind === "content").length + 1;
      current = {
        id: nextId(),
        kind: "content",
        badge: String(nth).padStart(2, "0"),
        heading: h2[1].trim(),
        body: "",
        imageUrl: "",
      };
      continue;
    }

    const img = IMAGE_LINE.exec(line);
    if (img && current) {
      if (current.kind === "cover" || current.kind === "content") {
        current.imageUrl = img[1].trim();
      }
      continue;
    }

    if (current) buffer.push(line);
  }
  flush();

  slides.push(makeCtaSlide(nextId(), cta));
  return slides;
}

/**
 * 文件裡 offset 這個位置落在第幾頁（從 0 算），跟 parseMarkdown 切頁的規則
 * 一致：每個 `# ` 或 `## ` 開一頁。在第一個標題之前回傳 null。
 */
export function slideIndexAt(source: string, offset: number): number | null {
  // 切到游標那一行的行尾：游標停在標題中間也要算進這一頁
  const lineEnd = source.indexOf("\n", offset);
  const upto = lineEnd === -1 ? source : source.slice(0, lineEnd);
  const headings = upto.split("\n").filter((line) => /^#{1,2}\s+/.test(line)).length;
  return headings === 0 ? null : headings - 1;
}

/**
 * 反向：把目前的頁面倒回 Markdown。這是存檔時真正落到磁碟上的內容，
 * 所以 parseMarkdown 讀得回來的東西這裡都要寫出去。
 * CTA 頁不在這裡，它走 frontmatter（見 post-file.ts）。
 */
export function toMarkdown(slides: Slide[]): string {
  const chunks: string[] = [];
  for (const slide of slides) {
    if (slide.kind === "cover") {
      chunks.push(`# ${slide.title}`);
      if (slide.imageUrl) chunks.push(`![](${slide.imageUrl})`);
    } else if (slide.kind === "content") {
      chunks.push(`## ${slide.heading}`);
      if (slide.imageUrl) chunks.push(`![](${slide.imageUrl})`);
      if (slide.body) chunks.push(slide.body);
    }
  }
  return chunks.join("\n\n") + "\n";
}

/** 這篇的結尾 CTA 頁。存檔時要把它從頁面裡撈出來寫進 frontmatter。 */
export const ctaOf = (slides: Slide[]): CtaSlide | undefined =>
  slides.find((slide): slide is CtaSlide => slide.kind === "cta");

/** 內頁重新編號，刪頁或搬動順序之後呼叫。 */
export function renumber(slides: Slide[]): Slide[] {
  let n = 0;
  return slides.map((slide) => {
    if (slide.kind !== "content") return slide;
    n += 1;
    return { ...slide, badge: String(n).padStart(2, "0") };
  });
}

export const SAMPLE = `# Vite+ 來了，前端工具鏈的全面進化

## 前言

2026 年 3 月，在荷蘭阿姆斯特丹舉辦的 Vue.js Amsterdam 大會上，VoidZero 正式發布了 Vite Plus。

這是 Vite 工具鏈的全面性進化，如果你是前端開發者，這絕對是你今年最不能錯過的消息。

## 一個工具，取代全部

過去開一個新專案，你得花大量時間安裝和設定各種工具：ESLint 負責 Lint、Prettier 負責格式化、Vitest 負責測試、Vite 負責打包。

Vite+ 的目標很簡單：把 **Vite、Vitest、Rolldown、Oxlint、Oxfmt、tsdown** 全部整合進一個統一的工具鏈。

## 核心指令

Vite+ 的 CLI 統一使用 \`vp\` 作為入口，涵蓋開發流程的每個階段：

- \`vp dev\` 啟動支援 HMR 的開發伺服器
- \`vp check\` 同時執行格式化、Lint 與型別檢查
- \`vp test\` 透過 Vitest 執行單元測試
- \`vp build\` 使用 Rolldown 進行生產環境打包
`;
