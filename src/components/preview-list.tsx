"use client";

import { DownloadIcon } from "lucide-react";
import { SlideCard } from "./slide-card";
import { Tool } from "./slide-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  /** 在畫布上直接改字（見 SlideText） */
  onEdit: (id: string, changes: Partial<Slide>) => void;
  /** 浮動工具列裡的頁面動作（排序、刪除、圖片，見 SlideToolbar） */
  renderToolbar: (slide: Slide, index: number) => React.ReactNode;
  /** 清單最後的新增按鈕。窄螢幕的逐頁沒有表單，靠這裡加頁 */
  footer?: React.ReactNode;
}

export function PreviewList({
  slides,
  handle,
  timestamp,
  theme,
  activeId,
  onSelect,
  onDownload,
  onEdit,
  renderToolbar,
  footer,
}: PreviewListProps) {
  const { ref, scale } = useCanvasScale(MAX_SCALE, GUTTER_X, GUTTER_Y);

  return (
    // 一個 Provider 包住所有工具列：指過第一顆之後，滑到旁邊那顆的提示就不用再等
    <TooltipProvider delay={300}>
      <div
        ref={ref}
        className="flex flex-col items-center gap-16"
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
              頁次是次要資訊，安靜地放在這一張的左上角。手機寬度下工具列幾乎跟
              卡片一樣寬，沒地方放，就交給頂列的讀數。
            */}
              <span className="text-muted-foreground absolute top-0 left-0 -translate-y-[calc(100%+1.125rem)] font-mono text-xs tracking-wider tabular-nums max-sm:hidden">
                {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </span>

              {/*
              每張右上方常駐的頁面工具列，跟 Canva 每頁上方那排一樣。
              原本是指到或選到才浮出來，但觸控螢幕沒有 hover，
              不先點一下根本不知道有這些動作 —— 所以一直開著。
            */}
              <div
                data-slot="slide-quickbar"
                className="absolute top-0 right-0 z-10 flex -translate-y-[calc(100%+0.625rem)] items-center gap-0.5"
              >
                {renderToolbar(slide, index)}
                {/* 單張下載很少用（通常是整份 ZIP），所以只是工具列最後一顆不起眼的 icon */}
                <Tool label={`下載第 ${index + 1} 張 PNG`} onClick={() => onDownload(slide, index)}>
                  <DownloadIcon />
                </Tool>
              </div>

              {/*
              不是 <button>：畫布裡的文字點了會變成 textarea，
              按鈕裡放輸入框是無效的 HTML，Firefox 還會把點擊吃掉不給 focus。
              用鍵盤的話，Tab 進到畫布裡任一段字時 onFocus 一樣會選到這一張；
              縮圖列也能選頁。
            */}
              {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- 鍵盤路徑走 onFocus 與縮圖列 */}
              <div
                onClick={() => onSelect(slide.id)}
                onFocus={() => onSelect(slide.id)}
                className={cn(
                  // 沒有外框：畫布靠陰影從冷灰檯面上浮起來就夠了。
                  // 陰影也只要很輕的一層，太重會顯髒，也會蓋過版型自己的顏色
                  "block overflow-hidden rounded-lg shadow-[0_1px_3px_rgb(14_19_24/0.1),0_8px_24px_-8px_rgb(14_19_24/0.14)] transition-[box-shadow,--tw-ring-color] duration-100",
                  // 選取是狀態不是裝飾，所以它是唯一還畫線的地方 —— 也是全站唯一的彩色
                  active && "ring-ring ring-2",
                )}
                style={{ width: CANVAS.width * scale, height: CANVAS.height * scale }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <SlideCard
                    slide={slide}
                    handle={handle}
                    timestamp={timestamp}
                    theme={theme}
                    onEdit={(changes) => onEdit(slide.id, changes)}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {footer && <div className="lg:hidden">{footer}</div>}
      </div>
    </TooltipProvider>
  );
}
