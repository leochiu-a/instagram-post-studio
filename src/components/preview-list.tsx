"use client";

import { DownloadIcon } from "lucide-react";
import { SlideCard } from "./slide-card";
import { Button } from "@/components/ui/button";
import { CANVAS } from "@/lib/theme";
import { useFitScale } from "@/lib/use-fit-scale";
import { cn } from "@/lib/utils";
import type { Slide, ThemeName } from "@/lib/types";

/** 預覽欄的左右留白，縮放時要先扣掉 */
const GUTTER = 24;

/** 再寬也不要把 1080px 的畫布放大過頭，看起來會很鬆散 */
const MAX_SCALE = 0.6;

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
  const { ref, scale } = useFitScale(MAX_SCALE);

  return (
    <div ref={ref} className="flex flex-col items-center gap-7" style={{ padding: GUTTER }}>
      {slides.map((slide, index) => (
        <div key={slide.id} className="flex flex-col gap-2">
          {/* 讀數列：頁次、實際輸出尺寸、下載。全部等寬對齊，像一台機器的標籤 */}
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-wider tabular-nums">
              <span className="text-foreground">
                {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground ml-2">
                {CANVAS.width}×{CANVAS.height}
              </span>
            </span>
            <Button
              variant="ghost"
              size="xs"
              aria-label={`下載第 ${index + 1} 張 PNG`}
              onClick={() => onDownload(slide, index)}
            >
              <DownloadIcon data-icon="inline-start" />
              PNG
            </Button>
          </div>

          <button
            type="button"
            onClick={() => onSelect(slide.id)}
            aria-pressed={activeId === slide.id}
            aria-label={`選取第 ${index + 1} 張`}
            className={cn(
              "focus-visible:ring-ring/50 overflow-hidden rounded-sm shadow-[0_1px_2px_rgb(0_0_0/0.4),0_12px_32px_-12px_rgb(0_0_0/0.6)] ring-1 transition-[box-shadow,--tw-ring-color] duration-100 outline-none focus-visible:ring-3",
              activeId === slide.id
                ? "ring-primary ring-2"
                : "ring-border hover:ring-muted-foreground/40",
            )}
            style={{ width: CANVAS.width * scale, height: CANVAS.height * scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <SlideCard slide={slide} handle={handle} timestamp={timestamp} theme={theme} />
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
