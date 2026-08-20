"use client";

import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, KeyboardSensor } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { LayersIcon } from "lucide-react";
import { SlideCard } from "./slide-card";
import { CANVAS } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Slide, ThemeName } from "@/lib/types";

/** 縮圖寬度。認得出是哪一張就夠了，再大就變成第二個預覽欄 */
const THUMB_WIDTH = 52;

const THUMB_SCALE = THUMB_WIDTH / CANVAS.width;

/**
 * 整張縮圖就是拖曳把手，而 dnd-kit 對「按在把手上的滑鼠」預設不設任何門檻 ——
 * pointerdown 當下就進入拖曳，接著 pointerup 被它 preventDefault 吃掉，
 * click 因此永遠不會發生（縮圖點了沒反應就是這個原因）。
 *
 * 改成只用位移門檻：原地點一下不算拖曳，click 正常送出；移動超過 5px 才開始拖，
 * 也不像預設的 Delay(200ms) 那樣「按下去馬上拖」會被判定成不是拖曳。
 * sensors 是整組覆寫，所以鍵盤排序要自己接回來。
 */
const SENSORS = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 5 })],
  }),
  KeyboardSensor,
];

interface ThumbProps {
  slide: Slide;
  index: number;
  active: boolean;
  handle: string;
  timestamp: string;
  theme: ThemeName;
  onSelect: (id: string) => void;
}

function Thumb({ slide, index, active, handle, timestamp, theme, onSelect }: ThumbProps) {
  const { ref, handleRef, isDragSource } = useSortable({ id: slide.id, index });

  return (
    <li
      /*
        ref 與 handleRef 指到同一個元素：整張縮圖就是拖曳把手。
        （ref 回傳值要吞掉：React 19 會把 ref callback 的回傳值當成 cleanup）
      */
      ref={(element) => {
        ref(element);
        handleRef(element);
      }}
      className={cn("shrink-0 touch-none", isDragSource && "opacity-40")}
      style={{ width: THUMB_WIDTH }}
    >
      <button
        type="button"
        aria-label={`第 ${index + 1} 張縮圖`}
        aria-pressed={active}
        onClick={() => onSelect(slide.id)}
        className={cn(
          "focus-visible:ring-ring/50 block cursor-grab overflow-hidden rounded-sm shadow-[0_1px_2px_rgb(14_19_24/0.12)] transition-[box-shadow,--tw-ring-color] duration-100 outline-none focus-visible:ring-3 active:cursor-grabbing",
          active && "ring-ring ring-2",
        )}
        style={{ width: THUMB_WIDTH, height: CANVAS.height * THUMB_SCALE }}
      >
        <div style={{ transform: `scale(${THUMB_SCALE})`, transformOrigin: "top left" }}>
          <SlideCard slide={slide} handle={handle} timestamp={timestamp} theme={theme} decorative />
        </div>
      </button>
    </li>
  );
}

interface SlideFilmstripProps {
  slides: Slide[];
  handle: string;
  timestamp: string;
  theme: ThemeName;
  activeId: string | null;
  onSelect: (id: string) => void;
  onReorder: (slides: Slide[]) => void;
}

/**
 * 底部的頁面列。
 *
 * 橫向排列是刻意的：IG 輪播本來就是左右滑的，縮圖列橫著排，
 * 編輯時的空間關係才跟成品的閱讀方式一致。
 *
 * 一直開著、沒有收合。它只佔一列很矮的高度，換來的是「整份貼文的順序」
 * 隨時看得到 —— 那正是編輯輪播時最需要在眼前的資訊。縮圖可以直接拖曳排序。
 */
export function SlideFilmstrip({
  slides,
  handle,
  timestamp,
  theme,
  activeId,
  onSelect,
  onReorder,
}: SlideFilmstripProps) {
  return (
    <div className="bg-background flex shrink-0 items-center gap-3 p-2.5">
      {/*
        純讀數，不是按鈕 —— 這一列不會收起來，所以沒有可按的東西。
        高度對齊縮圖，視覺上是同一列的一部分。
      */}
      <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 px-1 text-sm font-medium">
        <LayersIcon className="size-4" />
        頁面
        <span className="font-mono text-xs tabular-nums">
          {String(slides.length).padStart(2, "0")}
        </span>
      </span>

      <DragDropProvider
        sensors={SENSORS}
        /*
          用官方的 move 而不是自己 splice：dnd-kit 在拖曳過程中就已經把
          目標位置算好了（縮圖會即時讓位），事件裡的 index 是那個結果。
          自己從 id 反推會跟它的內部狀態對不上。
        */
        onDragEnd={(event) => {
          if (event.canceled) return;
          const next = move(slides, event);
          if (next !== slides) onReorder(next);
        }}
      >
        <ol className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5">
          {slides.map((slide, index) => (
            <Thumb
              key={slide.id}
              slide={slide}
              index={index}
              active={activeId === slide.id}
              handle={handle}
              timestamp={timestamp}
              theme={theme}
              onSelect={onSelect}
            />
          ))}
        </ol>
      </DragDropProvider>
    </div>
  );
}
