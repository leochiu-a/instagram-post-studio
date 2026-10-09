"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ReelStage } from "./reel-stage";
import type { Timeline } from "@/lib/reel/timeline";
import type { ReelDefinition } from "@/lib/reel/types";
import { REEL_CANVAS } from "@/lib/theme";
import { useFitScale } from "@/lib/use-fit-scale";
import { REELS } from "@/reels";

/** 縮圖就是真正的畫布：有封面就畫封面，沒有就停在 poster 那一秒，跟貼文一樣不另做假預覽 */
function Poster({ reel }: { reel: ReelDefinition }) {
  // reel 跟貼文同寬，所以 useFitScale 以 1080 換算的比例可以直接用
  const { ref, scale } = useFitScale(0.5, 0.22);
  const onReady = useCallback((tl: Timeline) => tl.seek(reel.poster), [reel]);
  return (
    <div
      ref={ref}
      className="bg-muted w-full overflow-hidden"
      style={{ aspectRatio: `${REEL_CANVAS.width} / ${REEL_CANVAS.height}` }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ReelStage reel={reel} cover={reel.Cover !== undefined} onReady={onReady} />
      </div>
    </div>
  );
}

export function ReelList() {
  return (
    <section className="flex flex-col">
      <h2 className="text-muted-foreground px-4 pt-8 pb-3 font-mono text-[0.7rem] tracking-wider tabular-nums">
        REELS · 1080×1920 · MP4
      </h2>
      <ul className="grid grid-cols-3 gap-0.5 p-0.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {REELS.map((reel) => (
          <li key={reel.id} className="group relative">
            <Link
              href={`/reel/${reel.id}`}
              aria-label={`開啟「${reel.title}」`}
              className="focus-visible:ring-ring/50 rounded-xs relative block overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-3"
            >
              <Poster reel={reel} />
              <span className="pointer-events-none absolute top-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[0.65rem] text-white tabular-nums backdrop-blur-sm">
                {reel.duration}s
              </span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/80 to-transparent px-2 pt-8 pb-2 transition-opacity duration-150 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                <p className="truncate text-xs font-medium text-white">{reel.title}</p>
                <p className="truncate font-mono text-[0.65rem] tracking-wide text-white/70 tabular-nums">
                  REEL · {reel.handle}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
