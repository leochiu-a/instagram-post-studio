"use client";

import { ReelPlayer } from "@/components/reel-player";
import type { ThemeName } from "@/lib/types";
import { findReel } from "@/reels";

export function ReelClient({
  id,
  render,
  cover,
  theme,
}: {
  id: string;
  render: boolean;
  /** 輸出模式下畫封面（scripts/render-reel.mjs --cover） */
  cover: boolean;
  /** 網址上的 ?theme=，沒有就用 reel 自己的 */
  theme?: ThemeName;
}) {
  const reel = findReel(id);
  return reel ? (
    <ReelPlayer reel={reel} render={render} cover={cover} theme={theme ?? reel.theme} />
  ) : null;
}
