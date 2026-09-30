"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { synthesizeMusic } from "./music";
import type { ReelDefinition } from "./types";

/**
 * 預覽頁的配樂：跟 scripts/render-reel.mjs 輸出 MP4 時同一份合成結果，用 Web Audio 播。
 *
 * 畫面的時間仍然由預覽頁的 requestAnimationFrame 推進，這裡只在「開始播」的那一刻把音樂
 * 對到當下的秒數：打開聲音、按播放、迴圈繞回開頭時各重新起播一次；暫停與拖時間軸就停掉。
 * 一支 55 秒的片子兩邊各自走，誤差不到一格，不必每一格去校正。
 *
 * 合成要 1 秒多，所以等使用者第一次打開聲音才做，之後留著重用。瀏覽器也要求 AudioContext
 * 在使用者操作之後才能出聲，預設關著剛好。
 */
export function useReelAudio(
  reel: ReelDefinition,
  { enabled, playing, time }: { enabled: boolean; playing: boolean; time: number },
) {
  const context = useRef<AudioContext | null>(null);
  // 記住是哪一支 reel 的合成結果：換了 reel 就要重新合成
  const buffer = useRef<{ reel: ReelDefinition; data: AudioBuffer } | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const lastTime = useRef(time);

  const stop = useEffectEvent(() => {
    source.current?.stop();
    source.current?.disconnect();
    source.current = null;
  });

  const start = useEffectEvent((at: number) => {
    stop();
    context.current ??= new AudioContext();
    const ctx = context.current;
    if (buffer.current?.reel !== reel) {
      const audio = synthesizeMusic(reel.duration, reel.music);
      const data = ctx.createBuffer(2, audio.left.length, audio.sampleRate);
      data.copyToChannel(audio.left, 0);
      data.copyToChannel(audio.right, 1);
      buffer.current = { reel, data };
    }
    const { data } = buffer.current;
    void ctx.resume();
    const node = ctx.createBufferSource();
    node.buffer = data;
    node.connect(ctx.destination);
    node.start(0, Math.min(at, data.duration));
    source.current = node;
  });

  // 打開聲音、按播放：從當下的秒數開始；關掉或暫停（拖時間軸也會暫停）：停
  useEffect(() => {
    if (!enabled || !playing) return;
    start(lastTime.current);
    return () => stop();
  }, [enabled, playing]);

  // 迴圈繞回開頭：時間變小了，重新起播
  useEffect(() => {
    if (enabled && playing && time < lastTime.current) start(time);
    lastTime.current = time;
  }, [time, enabled, playing]);

  useEffect(
    () => () => {
      void context.current?.close();
      context.current = null;
    },
    [],
  );
}
