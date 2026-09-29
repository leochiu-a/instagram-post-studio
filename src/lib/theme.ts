import type { ThemeName } from "./types";

/**
 * 所有數值都是從 Canva 版型量出來的原始座標（畫布 1080×1350）。
 * 元素一律用絕對定位擺在同樣的位置，匯出時就會跟 Canva 逐 px 對齊。
 */
export const CANVAS = { width: 1080, height: 1350 } as const;

export const METRICS = {
  /** 左右安全邊界 */
  padding: 71.12,
  /** 內容區塊寬度（內文、大標共用） */
  contentWidth: 935.84,
  contentLeft: 73.04,

  header: { top: 143.87, fontSize: 30.67, lineHeight: 1.4 },

  badge: { top: 108, fontSize: 58.67, lineHeight: 1.4 },

  body: { top: 236.34, fontSize: 40, lineHeight: 1.55, letterSpacing: -0.006 },

  /** 封面大標：top 是整個封面版塊的唯一調整鈕，圖片底邊會跟著它走 */
  coverTitle: { top: 818, fontSize: 88, lineHeight: 1.5, letterSpacing: -0.011 },

  /** 內文與圖片之間的間距 */
  bodyImageGap: 48,

  /** 圖片版位共用同一組尺寸，封面與內頁都取用這裡 */
  image: {
    /** 內頁橫幅：寬度是內容區滿寬，只有高度是固定的（錨在內容區底部） */
    banner: { height: 278.61 },
    /**
     * 封面的橫幅：左右切齊大標（不是版面的安全邊界），高度隨圖片比例長，
     * 底邊錨在大標上方一個 bodyImageGap 的位置，所以不管什麼比例的圖都不會被裁。
     */
    coverBanner: { left: 73.04, width: 935.84, maxHeight: 510 },
    square: { top: 301.46, left: 344.75, size: 390.5 },
  },

  swipe: {
    left: 754.77,
    top: 1261.75,
    width: 395.92,
    height: 124.93,
    labelLeft: 81.06,
    labelFontSize: 45.8,
    iconLeft: 247.37,
    iconSize: 54.84,
  },

  cta: {
    subhead: { top: 325.17, fontSize: 38.67 },
    headline: {
      top: 411.01,
      left: 108,
      width: 864,
      fontSize: 78.67,
      lineHeight: 1.11,
      letterSpacing: -0.02,
    },
    pill: { top: 801.84, left: 160.72, width: 758.55, height: 223 },
    icons: { top: 851.11, size: 62.23 },
    counts: { top: 940.36, fontSize: 32 },
    /** 四個 icon 的水平中心點 */
    columns: [285.7, 459.27, 623.46, 785.84],
    arrow: { top: 592, left: 150, width: 100, height: 198 },
    /** 原稿沒有這個欄位：擺在互動膠囊下方的空白帶，不會壓到大標與 icon */
    image: { top: 1070, left: 71.12, width: 935.84, height: 200 },
  },
} as const;

export interface Palette {
  /** 背景，可以是漸層或純色 */
  background: string;
  text: string;
  /** 頁首（handle / 時間）的顏色 */
  meta: string;
  /** 內文 **粗體** 的強調色 */
  accent: string;
  /** `程式碼` chip：淺色圓角底 + 深色字，量自原稿 */
  code: { fill: string; text: string };
  /** SWIPE 膠囊底色 */
  swipeFill: string;
  swipeText: string;
  /** 結尾頁的 icon 膠囊底色 */
  ctaPillFill: string;
  ctaPillText: string;
  /** 結尾頁的手繪箭頭 */
  arrow: string;
}

/**
 * 原稿的程式碼是深色字壓在淺色圓角底上（深淺兩版都一樣），
 * 所以 chip 不隨配色改變。圓角 12 也是量自原稿。
 */
const CODE_CHIP = { fill: "#d8e2e6", text: "#234b52" } as const;

export const CODE_CHIP_RADIUS = 12;

/**
 * chip 的盒子。
 *
 * 字體的 em box 是不對稱的（40px 時 ascent 46、descent 12），而字真正的
 * 墨水只佔 ascent 32 / descent 9。所以上下對稱的內距永遠會多出一截空白在
 * 上面、下緣卻剛好貼著 descender —— 「p」「g」的下緣就像被切掉。
 *
 * 這裡直接對齊墨水：line-height 1em 把基線放在盒子頂端 37px（0.925em）處，
 * 再用不對稱的上下內距把盒子撐到 1.325em。墨水上下各留一截空隙，盒子又比
 * 內文行距（1.55em）矮，連續幾行的 chip 不會相連，行框也不會被撐開。
 */
export const CODE_CHIP_BOX = {
  lineHeight: "1em",
  padding: "0.075em 0.22em 0.25em",
} as const;

export const PALETTES: Record<ThemeName, Palette> = {
  dark: {
    background: "linear-gradient(135deg, #1d2a3a 0%, #0c1320 100%)",
    text: "#ffffff",
    meta: "#ffffff",
    accent: "#8d99ae",
    code: CODE_CHIP,
    swipeFill: "#2b2d42",
    swipeText: "#ffffff",
    ctaPillFill: "#234b52",
    ctaPillText: "#f0efeb",
    arrow: "#8d99ae",
  },
  light: {
    background: "#f8f7f4",
    text: "#2b2d42",
    meta: "#234b52",
    accent: "#8d99ae",
    code: CODE_CHIP,
    swipeFill: "#2b2d42",
    swipeText: "#ffffff",
    ctaPillFill: "#234b52",
    ctaPillText: "#f0efeb",
    arrow: "#8d99ae",
  },
};

/**
 * Reels 畫布（9:16）。寬度跟貼文一樣是 1080，所以頁首、字級、左右邊界都能直接沿用 METRICS；
 * 多出來的 570px 高度平均分到上下，讓貼文的版位（例如結尾 CTA）整塊平移就能置中。
 */
export const REEL_CANVAS = { width: 1080, height: 1920 } as const;

export const REEL_METRICS = {
  /** 把 1350 高的貼文版位放進 1920 畫布時的垂直位移 */
  postOffset: (REEL_CANVAS.height - CANVAS.height) / 2,
  caption: { top: 250, fontSize: 80, lineHeight: 1.3 },
  subcaption: { fontSize: 40, lineHeight: 1.55 },
  /** 示範區與程式碼區。IG 的底部說明與右側按鈕會蓋住 y > 1550 的區域，重點不放那裡 */
  demo: { top: 620 },
  code: { top: 1180, fontSize: 30 },
} as const;

/** Reels 的一組配色。每個角色的意思在 REEL_THEMES 上方說明 */
export interface ReelColors {
  background: string;
  text: string;
  muted: string;
  /** 帳號的品牌色：系列膠囊、示範 UI 的按鈕、CTA 膠囊 */
  brand: string;
  /** 壓在 brand 上的字 */
  brandInk: string;
  /** 對／解法 */
  ok: string;
  /** 錯／問題 */
  bad: string;
  /** 壓在 ok / bad 記號上的字 */
  ink: string;
  /** 卡片、表單這類示範 UI 的底 */
  card: string;
  /** 程式碼、說明卡片的面板 */
  panel: string;
  line: string;
  /** 三個輔助色，互相區分用：row 色帶與它的標籤（標籤上的字是 ink） */
  tints: readonly [string, string, string];
  /** 說明卡片裡 `程式碼` chip 的字色（底是它的 14%） */
  chip: string;
  /**
   * 程式碼區塊自己的一組顏色。語法色要在程式碼底上讀得清楚，跟頁面的底不一定是同一個明度 ——
   * 淺色版的程式碼區塊是深底。
   */
  code: {
    background: string;
    text: string;
    line: string;
    selector: string;
    property: string;
    value: string;
    comment: string;
    /** 重點行的框與底 */
    highlight: string;
  };
}

/**
 * Reels 自己的配色，深淺兩套，跟貼文一樣用 ThemeName 切換。
 * 貼文是停下來慢慢讀的，所以整套低飽和；影片是被滑過去的，那組灰藍在手機上太淡，
 * 所以 reel 另外配色。版位、字體、行內標記、結尾 CTA 仍然跟貼文共用，只換顏色。
 *
 * - dark：近黑底 + 紫色品牌、萊姆綠對、紅錯（使用者比過多組後選定）
 * - light：Catppuccin Latte 的官方色票（github.com/catppuccin/palette），藍色品牌、綠對、紅錯。
 *   Latte 的語法色是粉彩，放在淺灰底上對比只有 2～2.8:1，所以程式碼區塊改用同家族的
 *   Catppuccin Mocha（深底）—— 淺色頁面配深色程式碼，Tailwind、Stripe 的文件也是這樣做
 */
export const REEL_THEMES: Record<ThemeName, ReelColors> = {
  dark: {
    background:
      "radial-gradient(900px 700px at 85% 5%, rgb(139 92 246 / 22%), transparent 60%), " +
      "radial-gradient(800px 600px at 0% 100%, rgb(163 230 53 / 10%), transparent 60%), #0d0e13",
    text: "#f4f4f6",
    muted: "#9a9cab",
    brand: "#8b5cf6",
    brandInk: "#ffffff",
    ok: "#a3e635",
    bad: "#fb4f6f",
    ink: "#111111",
    card: "#1d2030",
    panel: "#171922",
    line: "#2a2d3a",
    tints: ["#fcd34d", "#67e8f9", "#fdba74"],
    chip: "#fcd34d",
    code: {
      background: "#171922",
      text: "#f4f4f6",
      line: "#2a2d3a",
      selector: "#fcd34d",
      property: "#67e8f9",
      value: "#fdba74",
      comment: "#6b6f85",
      highlight: "#a3e635",
    },
  },
  light: {
    background: "#eff1f5", // base
    text: "#4c4f69", // text
    muted: "#6c6f85", // subtext0
    brand: "#1e66f5", // blue
    brandInk: "#eff1f5",
    ok: "#40a02b", // green
    bad: "#d20f39", // red
    ink: "#eff1f5",
    card: "#e6e9ef", // mantle
    panel: "#dce0e8", // crust
    line: "#ccd0da", // surface0
    tints: ["#1e66f5", "#179299", "#8839ef"], // blue、teal、mauve：壓淺色字還讀得到的三個
    chip: "#8839ef", // mauve，在 mantle 上 4.5:1
    code: {
      // Catppuccin Mocha
      background: "#1e1e2e", // base
      text: "#cdd6f4", // text
      line: "#45475a", // surface1
      selector: "#f9e2af", // yellow
      property: "#89dceb", // sky
      value: "#fab387", // peach
      comment: "#7f849c", // overlay1
      highlight: "#a6e3a1", // green
    },
  },
};

/** ReelStage 把目前配色設成根節點上的這些 CSS 變數，場景元件與 CSS module 只認變數 */
export function reelCssVars(c: ReelColors) {
  return {
    "--reel-text": c.text,
    "--reel-muted": c.muted,
    "--reel-brand": c.brand,
    "--reel-brand-ink": c.brandInk,
    "--reel-ok": c.ok,
    "--reel-bad": c.bad,
    "--reel-ink": c.ink,
    "--reel-card": c.card,
    "--reel-panel": c.panel,
    "--reel-line": c.line,
    "--reel-tint-1": c.tints[0],
    "--reel-tint-2": c.tints[1],
    "--reel-tint-3": c.tints[2],
    "--reel-chip": c.chip,
    "--reel-code-bg": c.code.background,
    "--reel-code-text": c.code.text,
    "--reel-code-line": c.code.line,
    "--reel-code-selector": c.code.selector,
    "--reel-code-property": c.code.property,
    "--reel-code-value": c.code.value,
    "--reel-code-comment": c.code.comment,
    "--reel-code-highlight": c.code.highlight,
  };
}

/**
 * 交給 RichText / CtaBody 的 Palette。全部是 CSS 變數，所以同一份場景深淺都能用。
 * **粗體** 的顏色由大標的語氣決定（見 Caption），這裡預設是 ok。
 */
export const REEL_PALETTE: Palette = {
  background: "transparent",
  text: "var(--reel-text)",
  meta: "var(--reel-muted)",
  accent: "var(--reel-ok)",
  code: {
    fill: "color-mix(in srgb, var(--reel-chip) 14%, transparent)",
    text: "var(--reel-chip)",
  },
  swipeFill: "var(--reel-panel)",
  swipeText: "var(--reel-text)",
  ctaPillFill: "var(--reel-brand)",
  ctaPillText: "var(--reel-brand-ink)",
  arrow: "var(--reel-muted)",
};
