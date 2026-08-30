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
