"use client";

import { DownloadIcon } from "lucide-react";
import { SlideCard } from "./slide-card";
import { Button } from "@/components/ui/button";
import { CANVAS } from "@/lib/theme";
import { useCanvasScale } from "@/lib/use-fit-scale";
import { cn } from "@/lib/utils";
import type { Slide, ThemeName } from "@/lib/types";

/** 畫布區的左右留白。畫布是這個工具的主角，四周留白要撐得開 */
const GUTTER_X = 32;

/**
 * 上下留白。比左右多留一截，因為浮動快捷列是浮在卡片正上方的 ——
 * 不留的話，第一張的快捷列會被頂列切掉。
 */
const GUTTER_Y = 56;

/**
 * 上限只是保險絲。實際大小由畫布區的寬高決定 —— 側邊欄固定寬之後，
 * 螢幕愈大畫布就愈大，不再被綁在視窗的一半。
 */
const MAX_SCALE = 0.9;

interface PreviewListProps {
  slides: Slide[];
  handle: string;
  timestamp: string;
  theme: ThemeName;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDownload: (slide: Slide, index: number) => void;
}

export function PreviewList({
  slides,
  handle,
  timestamp,
  theme,
  activeId,
  onSelect,
  onDownload,
}: PreviewListProps) {
  const { ref, scale } = useCanvasScale(MAX_SCALE, GUTTER_X, GUTTER_Y);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-14"
      style={{ padding: `${GUTTER_Y}px ${GUTTER_X}px` }}
    >
      {slides.map((slide, index) => {
        const active = activeId === slide.id;

        return (
          <div
            key={slide.id}
            data-active={active || undefined}
            data-preview-slide={slide.id}
            className="group/slide relative"
            style={{ width: CANVAS.width * scale }}
          >
            {/*
              兩層工具列的下層：貼在這一張正上方的浮動快捷列，
              指到、選到、或鍵盤 focus 進去才浮出來。

              深色藥丸壓在淺灰檯面上，跟 Polotno 貼在選中物件上方的那條一樣 ——
              五張預覽就常駐五條讀數列的話，工具會比作品還吵。
              pointer-events 跟著透明度一起關，收起來的時候不能擋到底下的畫布。
            */}
            <div
              data-slot="slide-quickbar"
              className="pointer-events-none absolute top-0 left-1/2 z-10 flex -translate-x-1/2 -translate-y-[calc(100%+0.625rem)] items-center gap-0.5 rounded-full bg-foreground p-1 opacity-0 shadow-md transition-opacity duration-100 group-focus-within/slide:pointer-events-auto group-focus-within/slide:opacity-100 group-hover/slide:pointer-events-auto group-hover/slide:opacity-100 group-data-active/slide:pointer-events-auto group-data-active/slide:opacity-100"
            >
              <span className="px-1.5 font-mono text-[0.7rem] tracking-wider text-background/70 tabular-nums">
                {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </span>
              <Button
                variant="ghost"
                size="xs"
                aria-label={`下載第 ${index + 1} 張 PNG`}
                className="text-background/80 hover:bg-background/15 hover:text-background focus-visible:ring-background/40"
                onClick={() => onDownload(slide, index)}
              >
                <DownloadIcon data-icon="inline-start" />
                PNG
              </Button>
            </div>

            <button
              type="button"
              onClick={() => onSelect(slide.id)}
              aria-pressed={active}
              aria-label={`選取第 ${index + 1} 張`}
              className={cn(
                // 沒有外框：畫布靠陰影從冷灰檯面上浮起來就夠了。
                // 陰影也只要很輕的一層，太重會顯髒，也會蓋過版型自己的顏色
                "focus-visible:ring-ring/50 block overflow-hidden rounded-lg shadow-[0_1px_3px_rgb(14_19_24/0.1),0_8px_24px_-8px_rgb(14_19_24/0.14)] transition-[box-shadow,--tw-ring-color] duration-100 outline-none focus-visible:ring-3",
                // 選取是狀態不是裝飾，所以它是唯一還畫線的地方 —— 也是全站唯一的彩色
                active && "ring-ring ring-2",
              )}
              style={{ width: CANVAS.width * scale, height: CANVAS.height * scale }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <SlideCard slide={slide} handle={handle} timestamp={timestamp} theme={theme} />
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
