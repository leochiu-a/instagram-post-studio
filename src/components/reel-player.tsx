"use client";

import { ArrowLeftIcon, PauseIcon, PlayIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReelStage } from "./reel-stage";
import { Button } from "@/components/ui/button";
import type { Timeline } from "@/lib/reel/timeline";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ReelDefinition, ReelMusic } from "@/lib/reel/types";
import { useReelAudio } from "@/lib/reel/use-reel-audio";
import { REEL_CANVAS } from "@/lib/theme";
import type { ThemeName } from "@/lib/types";

declare global {
  interface Window {
    /** scripts/render-reel.mjs 透過這個逐格 seek 截圖 */
    reelRender?: {
      duration: number;
      music: ReelMusic;
      theme: ThemeName;
      seek: (t: number) => void;
    };
  }
}

/**
 * 輸出模式：只有 1:1 的畫布，沒有任何介面。
 * 截圖工具的 viewport 直接設成 1080×1920，所以不需要縮放。
 */
function RenderView({ reel, theme }: { reel: ReelDefinition; theme: ThemeName }) {
  const onReady = useCallback(
    (timeline: Timeline) => {
      timeline.seek(0);
      window.reelRender = {
        duration: reel.duration,
        music: reel.music,
        theme,
        seek: (t) => timeline.seek(t),
      };
    },
    [reel, theme],
  );
  return <ReelStage reel={reel} theme={theme} onReady={onReady} />;
}

function PreviewView({ reel, initialTheme }: { reel: ReelDefinition; initialTheme: ThemeName }) {
  const [theme, setTheme] = useState(initialTheme);
  const timeline = useRef<Timeline | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [sound, setSound] = useState(false);
  useReelAudio(reel, { enabled: sound, playing, time });
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  // 畫布區同時吃寬與高，9:16 整支塞進視窗
  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        // 上下左右各留 24px，畫布不要貼著工具列
        setScale(Math.min((width - 48) / REEL_CANVAS.width, (height - 48) / REEL_CANVAS.height));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      setTime((t) => (t + (now - last) / 1000) % reel.duration);
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, reel.duration]);

  const timeRef = useRef(0);
  useEffect(() => {
    timeRef.current = time;
    timeline.current?.seek(time);
  }, [time]);

  // 時間軸排好的那一刻就對到目前的時間，不然會先閃一格沒排過的畫面
  const onReady = useCallback((tl: Timeline) => {
    timeline.current = tl;
    tl.seek(timeRef.current);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 px-3">
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-100 outline-none focus-visible:ring-3"
        >
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">貼文清單</span>
        </Link>
        <h1 className="min-w-0 truncate text-sm font-medium">{reel.title}</h1>
        <p className="text-muted-foreground ml-auto hidden font-mono text-[0.7rem] tracking-wider tabular-nums sm:block">
          1080×1920 · {reel.duration}s · pnpm reel {reel.id} --theme {theme}
        </p>
        <ToggleGroup
          aria-label="配色"
          value={[theme]}
          onValueChange={([next]) => next && setTheme(next as ThemeName)}
          variant="default"
        >
          <ToggleGroupItem value="dark">深色</ToggleGroupItem>
          <ToggleGroupItem value="light">淺色</ToggleGroupItem>
        </ToggleGroup>
      </header>

      <div ref={box} className="bg-canvas relative min-h-0 flex-1">
        <div
          className="absolute top-1/2 left-1/2 shadow-lg"
          style={{
            width: REEL_CANVAS.width,
            height: REEL_CANVAS.height,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <ReelStage reel={reel} theme={theme} onReady={onReady} />
        </div>
      </div>

      <div className="flex h-14 shrink-0 items-center gap-3 px-3">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label={playing ? "暫停" : "播放"}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label={sound ? "關閉聲音" : "開啟聲音"}
          aria-pressed={sound}
          onClick={() => setSound((on) => !on)}
        >
          {sound ? <Volume2Icon /> : <VolumeXIcon />}
        </Button>
        <input
          type="range"
          aria-label="時間軸"
          min={0}
          max={reel.duration}
          step={0.01}
          value={time}
          onChange={(event) => {
            setPlaying(false);
            setTime(Number(event.target.value));
          }}
          className="accent-foreground flex-1"
        />
        <span className="text-muted-foreground w-24 text-right font-mono text-xs tabular-nums">
          {time.toFixed(2)} / {reel.duration}s
        </span>
      </div>
    </div>
  );
}

export function ReelPlayer({
  reel,
  render,
  theme,
}: {
  reel: ReelDefinition;
  render: boolean;
  theme: ThemeName;
}) {
  return render ? (
    <RenderView reel={reel} theme={theme} />
  ) : (
    <PreviewView reel={reel} initialTheme={theme} />
  );
}
