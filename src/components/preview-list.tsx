"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SlideCard } from "./slide-card";
import { Button } from "./ui";
import { CANVAS } from "@/lib/theme";
import type { Slide, ThemeName } from "@/lib/types";

/** 預覽欄的左右留白，縮放時要先扣掉 */
const GUTTER = 24;

/** 再寬也不要把 1080px 的畫布放大過頭，看起來會很鬆散 */
const MAX_SCALE = 0.6;

/**
 * 預覽跟著欄寬縮放。
 *
 * 這一欄的寬度是視窗的一半，寫死的縮放比例只會在某個特定寬度剛好，
 * 所以量真正的容器寬度來換算 —— 拉寬視窗預覽就跟著變大。
 */
function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      // contentRect 已經扣掉 padding，這裡不能再減一次 GUTTER
      const width = entry.contentRect.width;
      if (width > 0) setScale(Math.min(width / CANVAS.width, MAX_SCALE));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, scale };
}

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
  const { ref, scale } = useFitScale();

  return (
    <div ref={ref} className="flex flex-col items-center gap-6" style={{ padding: GUTTER }}>
      {slides.map((slide, index) => (
        <div key={slide.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>
              {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
            <Button onClick={() => onDownload(slide, index)}>下載 PNG</Button>
          </div>
          <button
            type="button"
            onClick={() => onSelect(slide.id)}
            className={`overflow-hidden rounded-lg ring-1 transition ${
              activeId === slide.id ? "ring-2 ring-sky-500" : "ring-white/10 hover:ring-white/30"
            }`}
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
