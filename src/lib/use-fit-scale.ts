"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CANVAS } from "./theme";

/**
 * 讓 1080×1350 的版型跟著容器寬度縮放。
 *
 * 寫死的縮放比例只會在某個特定寬度剛好，所以量真正的容器寬度來換算 ——
 * 拉寬視窗或換成多欄網格，預覽就跟著變。
 *
 * @param maxScale 上限。預覽欄再寬也不該把畫布放大過頭，看起來會很鬆散。
 */
export function useFitScale(maxScale: number, initial = 0.4) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(initial);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      // contentRect 已經扣掉 padding，不需要再自己減一次
      const width = entry.contentRect.width;
      if (width > 0) setScale(Math.min(width / CANVAS.width, maxScale));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [maxScale]);

  return { ref, scale };
}
