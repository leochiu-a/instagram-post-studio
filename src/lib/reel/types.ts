import type { ComponentType } from "react";
import type { Timeline } from "./timeline";
import type { Palette } from "@/lib/theme";
import type { ThemeName } from "@/lib/types";

/** 跟畫面同步的音效。時間都是秒，note 是 MIDI 音高 */
export type SoundCue =
  | { kind: "whoosh"; at: number }
  | { kind: "bonk"; at: number }
  | { kind: "chime"; at: number; note: number };

/**
 * 配樂的編排。曲子本身（96 BPM 的 lo-fi）由 scripts/reel-music.mjs 合成，
 * 每支 reel 只需要說鼓組在哪裡「下來」、哪些時間點要配音效。
 */
export interface ReelMusic {
  /** 鼓組全開的時間點，前面兩秒半會有漸強 */
  drop: number;
  cues: SoundCue[];
}

export interface ReelDefinition {
  /** 網址上的 slug，也是輸出的檔名 */
  id: string;
  title: string;
  handle: string;
  /** 頁首左邊紫色膠囊裡的系列名，例如「CSS 小技巧」 */
  series: string;
  /** 系列膠囊右邊的主題 */
  tag: string;
  /** 預設配色（REEL_THEMES）。預覽頁可以切換，輸出時用 --theme 覆寫 */
  theme: ThemeName;
  /** 秒 */
  duration: number;
  /** 清單縮圖停在哪一秒 */
  poster: number;
  music: ReelMusic;
  /** 所有會出現的元素一次畫好，進出場交給 build 排的時間軸 */
  Scene: ComponentType<{ palette: Palette }>;
  /** 在字型載入、版面排好之後執行：可以量真實的 DOM 位置再排動畫 */
  build: (root: HTMLElement, tl: Timeline) => void;
}
