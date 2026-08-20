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

/**
 * 預覽欄專用：同時吃寬與高。
 *
 * 只看寬度的話，畫布在筆電上會長到超過一個視窗高，捲一頁看不完整張；
 * 只看高度的話，窄視窗又會被切掉左右。所以兩個都量，取小的那個 ——
 * 一張版型剛好填滿畫布區，跟 Canva 一樣。
 *
 * 高度要量捲動容器（ref 的父層），量 ref 自己只會拿到內容總高。
 * 窄螢幕時捲動容器就是頁面流，高度必然夠大，自然由寬度決定。
 *
 * 上下留白通常比左右大：浮動快捷列是浮在卡片正上方的，第一張的上面要留得下它。
 *
 * @param gutterX 左右留白
 * @param gutterY 上下留白
 */
export function useCanvasScale(maxScale: number, gutterX: number, gutterY: number, initial = 0.4) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(initial);

  useLayoutEffect(() => {
    const node = ref.current;
    const box = node?.parentElement;
    if (!node || !box) return;

    const fit = () => {
      const width = node.clientWidth - gutterX * 2;
      const height = box.clientHeight - gutterY * 2;
      if (width > 0 && height > 0) {
        setScale(Math.min(width / CANVAS.width, height / CANVAS.height, maxScale));
      }
    };

    const observer = new ResizeObserver(fit);
    observer.observe(node);
    observer.observe(box);
    fit();
    return () => observer.disconnect();
  }, [maxScale, gutterX, gutterY]);

  return { ref, scale };
}
