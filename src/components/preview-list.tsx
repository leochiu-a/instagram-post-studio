"use client";

import { SlideCard } from "./slide-card";
import { Button } from "./ui";
import { CANVAS } from "@/lib/theme";
import type { Slide, ThemeName } from "@/lib/types";

const SCALE = 0.4;

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
  return (
    <div className="flex flex-col items-center gap-6">
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
            style={{ width: CANVAS.width * SCALE, height: CANVAS.height * SCALE }}
          >
            <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
              <SlideCard slide={slide} handle={handle} timestamp={timestamp} theme={theme} />
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
