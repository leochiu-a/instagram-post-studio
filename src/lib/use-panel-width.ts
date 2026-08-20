"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 面板寬度是「這台螢幕好不好用」的偏好，不是貼文的屬性，
 * 所以留在 localStorage、不進 Supabase —— 換機器不需要跟著跑。
 */
const STORAGE_KEY = "ig-post-studio:panel-width";

/** 表單欄位再窄就會擠成兩行；再寬就開始搶畫布的空間 */
export const PANEL_MIN = 260;
export const PANEL_MAX = 560;
const PANEL_DEFAULT = 340;

export function usePanelWidth() {
  const [width, setWidth] = useState(PANEL_DEFAULT);

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) {
      // oxlint-disable-next-line react/set-state-in-effect -- localStorage 在 SSR 讀不到，只能掛載後才還原
      setWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, stored)));
    }
  }, []);

  /** 拖曳中每一格都會呼叫，所以只寫記憶體與 localStorage，不碰網路 */
  const resize = useCallback((next: number) => {
    const clamped = Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(next)));
    setWidth(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
  }, []);

  return { width, resize };
}
