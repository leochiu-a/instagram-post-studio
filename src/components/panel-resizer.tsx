"use client";

/*
  oxlint-disable jsx-a11y/prefer-tag-over-role --
  可拖曳的分隔線就是 ARIA 的 window splitter pattern，規範要求
  role="separator" + tabindex。hr 是 non-interactive 元素，掛不了
  pointer/keyboard handler，這條規則在這個情境下是錯的。
*/

import { PANEL_MAX, PANEL_MIN } from "@/lib/use-panel-width";

/** 方向鍵一次調整的距離。Shift 一次跳一大格 */
const STEP = 16;
const BIG_STEP = 64;

interface PanelResizerProps {
  width: number;
  onResize: (width: number) => void;
}

/**
 * 面板與畫布之間的分隔線，拖它可以改面板寬度。
 *
 * 用 setPointerCapture 而不是往 document 掛 listener：拖到面板外面、
 * 甚至拖出視窗，事件都還會回到這個元素，不需要自己管註冊與清除。
 *
 * role="separator" + aria-valuenow 是 ARIA 對「可拖曳分隔線」的標準做法，
 * 所以方向鍵也要能調 —— 只能用滑鼠拖的分隔線對鍵盤使用者等於不存在。
 */
export function PanelResizer({ width, onResize }: PanelResizerProps) {
  return (
    <div
      role="separator"
      aria-label="調整面板寬度"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={PANEL_MIN}
      aria-valuemax={PANEL_MAX}
      tabIndex={0}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        // 用面板左緣到指標的距離算寬度，不是累加位移 —— 拖快了才不會漂掉
        const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
        onResize(event.clientX - left);
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? BIG_STEP : STEP;
        if (event.key === "ArrowLeft") onResize(width - step);
        else if (event.key === "ArrowRight") onResize(width + step);
        else return;
        event.preventDefault();
      }}
      /*
        線本身只有 1px 寬（分隔用的是面，不是線），但可以抓的範圍要更寬 ——
        所以元素是 9px 的透明帶，中間那個 span 才是看得到的線。
      */
      className="focus-visible:ring-ring/50 group absolute inset-y-0 -right-1 z-20 hidden w-[9px] cursor-col-resize touch-none outline-none focus-visible:ring-3 lg:block"
    >
      <span className="bg-border/0 group-hover:bg-border group-focus-visible:bg-border absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-100" />
    </div>
  );
}
