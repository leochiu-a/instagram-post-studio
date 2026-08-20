"use client";

import { ChevronDownIcon, LayersIcon } from "lucide-react";
import { SlideCard } from "./slide-card";
import { Button } from "@/components/ui/button";
import { CANVAS } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Slide, ThemeName } from "@/lib/types";

/** 縮圖寬度。認得出是哪一張就夠了，再大就變成第二個預覽欄 */
const THUMB_WIDTH = 52;

const THUMB_SCALE = THUMB_WIDTH / CANVAS.width;

interface SlideFilmstripProps {
  slides: Slide[];
  handle: string;
  timestamp: string;
  theme: ThemeName;
  activeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}

/**
 * 底部的頁面抽屜。
 *
 * 橫向排列是刻意的：IG 輪播本來就是左右滑的，縮圖列橫著排，
 * 編輯時的空間關係才跟成品的閱讀方式一致。
 *
 * 預設收起來，收起來時只剩左下角一顆按鈕浮在畫布上（Polotno 就是這個做法）——
 * 一直攤開的話會永久吃掉畫布的高度，而畫布才是這個工具的主角。
 * 展開時它是版面裡真正佔高度的一列，畫布區跟著變矮、預覽自己縮小，
 * 不會被蓋住。
 */
export function SlideFilmstrip({
  slides,
  handle,
  timestamp,
  theme,
  activeId,
  open,
  onOpenChange,
  onSelect,
}: SlideFilmstripProps) {
  const toggle = (
    <Button
      variant={open ? "ghost" : "outline"}
      size="sm"
      aria-expanded={open}
      className={cn("shrink-0", !open && "bg-background shadow-sm")}
      onClick={() => onOpenChange(!open)}
    >
      {open ? (
        <ChevronDownIcon data-icon="inline-start" />
      ) : (
        <LayersIcon data-icon="inline-start" />
      )}
      頁面
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {String(slides.length).padStart(2, "0")}
      </span>
    </Button>
  );

  if (!open) {
    // 高度為 0 的定位錨點：按鈕浮到畫布區的左下角，一格垂直空間都不佔
    return (
      <div className="relative z-20 shrink-0">
        <div className="absolute bottom-full left-3 mb-3">{toggle}</div>
      </div>
    );
  }

  return (
    <div className="bg-background flex shrink-0 items-center gap-3 p-2.5">
      {toggle}

      <ol className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {slides.map((slide, index) => {
          const active = activeId === slide.id;

          return (
            <li key={slide.id} className="shrink-0">
              <button
                type="button"
                aria-label={`跳到第 ${index + 1} 張`}
                aria-pressed={active}
                onClick={() => onSelect(slide.id)}
                className={cn(
                  "focus-visible:ring-ring/50 block overflow-hidden rounded-sm shadow-[0_1px_2px_rgb(14_19_24/0.12)] transition-[box-shadow,--tw-ring-color] duration-100 outline-none focus-visible:ring-3",
                  active && "ring-ring ring-2",
                )}
                style={{ width: THUMB_WIDTH, height: CANVAS.height * THUMB_SCALE }}
              >
                <div style={{ transform: `scale(${THUMB_SCALE})`, transformOrigin: "top left" }}>
                  <SlideCard
                    slide={slide}
                    handle={handle}
                    timestamp={timestamp}
                    theme={theme}
                    decorative
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
