"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Timeline } from "@/lib/reel/timeline";
import type { ReelDefinition } from "@/lib/reel/types";
import { METRICS, REEL_CANVAS, REEL_PALETTE, REEL_THEMES, reelCssVars } from "@/lib/theme";
import type { ThemeName } from "@/lib/types";

/**
 * 頁首：左邊是紫色的系列標籤 + 主題，右邊是帳號。
 * 位置與字級跟貼文的頁首同一條線（METRICS.header），只是內容換成影片需要的。
 */
function ReelHeader({ reel }: { reel: ReelDefinition }) {
  return (
    <div
      data-r="header"
      style={{
        position: "absolute",
        top: METRICS.header.top - 10,
        left: METRICS.padding,
        width: METRICS.contentWidth,
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: METRICS.header.fontSize,
        lineHeight: 1,
        fontWeight: 700,
        color: "var(--reel-muted)",
      }}
    >
      <span
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          background: "var(--reel-brand)",
          color: "var(--reel-brand-ink)",
        }}
      >
        {reel.series}
      </span>
      <span>{reel.tag}</span>
      <span style={{ marginLeft: "auto", fontWeight: 400 }}>{reel.handle}</span>
    </div>
  );
}

/**
 * 一支 reel 的畫布。跟 SlideCard 一樣永遠以真實尺寸（1080×1920）渲染，縮放交給外層。
 *
 * 顏色全部來自 theme.ts 的 REEL_THEMES，在這裡設成根節點上的 --reel-* 變數；場景元件拿到的
 * REEL_PALETTE 與 CSS module 都只認變數，所以同一支 reel 換 theme 不必重排時間軸。
 */
export function ReelStage({
  reel,
  theme = reel.theme,
  cover = false,
  onReady,
}: {
  reel: ReelDefinition;
  /** 預設用 reel 自己的 theme；預覽頁可以切換 */
  theme?: ThemeName;
  /** 畫封面（reel.Cover）而不是影片；封面是靜態的，不跑 build */
  cover?: boolean;
  /** 時間軸排好之後呼叫；呼叫端拿它 seek */
  onReady: (timeline: Timeline) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  // 呼叫端每次 render 都會給新的函式，不能讓它重跑 build
  const ready = useEffectEvent(onReady);
  // build 之前所有元素都疊在一起顯示，排好時間軸、seek 過一次才露出來
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const timeline = new Timeline();
    let cancelled = false;
    // 對齊線是量 DOM 畫的，字型還沒載入就量會量到 fallback 字的行高
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      if (!cover) reel.build(node, timeline);
      ready(timeline);
      setBuilt(true);
    });
    return () => {
      cancelled = true;
      timeline.dispose();
      setBuilt(false);
    };
  }, [reel, cover]);

  const c = REEL_THEMES[theme];
  return (
    <div
      ref={root}
      style={
        {
          position: "relative",
          width: REEL_CANVAS.width,
          height: REEL_CANVAS.height,
          overflow: "hidden",
          opacity: built ? 1 : 0,
          background: c.background,
          color: c.text,
          textAlign: "left",
          fontFamily: "var(--font-slide)",
          fontWeight: 400,
          ...reelCssVars(c),
        } as React.CSSProperties
      }
    >
      <ReelHeader reel={reel} />
      {cover && reel.Cover ? (
        <reel.Cover palette={REEL_PALETTE} />
      ) : (
        <reel.Scene palette={REEL_PALETTE} />
      )}
    </div>
  );
}
