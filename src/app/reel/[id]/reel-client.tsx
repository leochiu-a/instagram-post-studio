"use client";

import { ReelPlayer } from "@/components/reel-player";
import type { ThemeName } from "@/lib/types";
import { findReel } from "@/reels";

export function ReelClient({
  id,
  render,
  theme,
}: {
  id: string;
  render: boolean;
  /** 網址上的 ?theme=，沒有就用 reel 自己的 */
  theme?: ThemeName;
}) {
  const reel = findReel(id);
  return reel ? <ReelPlayer reel={reel} render={render} theme={theme ?? reel.theme} /> : null;
}
