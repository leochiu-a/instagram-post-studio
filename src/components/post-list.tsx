"use client";

import { LayersIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlideCard } from "./slide-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { SAMPLE } from "@/lib/markdown";
import { useHydrated, usePostList } from "@/lib/post-store";
import { CANVAS } from "@/lib/theme";
import { useFitScale } from "@/lib/use-fit-scale";
import type { Post } from "@/lib/types";

/** 格子裡的封面：直接縮放真正的版型，不另外做一套假的預覽 */
function Cover({ post }: { post: Post }) {
  const cover = post.slides[0];
  // 一格再寬也不需要超過原尺寸的一半
  const { ref, scale } = useFitScale(0.5, 0.22);

  return (
    <div
      ref={ref}
      className="bg-muted w-full overflow-hidden"
      style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}` }}
    >
      {cover && (
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <SlideCard
            slide={cover}
            handle={post.handle}
            timestamp={post.timestamp}
            theme={post.theme}
            decorative
          />
        </div>
      )}
    </div>
  );
}

export function PostList() {
  const { posts, addPost, removePost } = usePostList();
  const hydrated = useHydrated();
  const router = useRouter();
  const open = (id: string) => router.push(`/post/${id}`);

  return (
    <div className="flex min-h-full flex-col">
      {/* 跟編輯頁同一條 h-14 應用列：滿版、貼齊視窗兩端，主要動作在最右 */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-base font-semibold tracking-tight">IG Post Studio</h1>
          <p className="text-muted-foreground hidden font-mono text-[0.7rem] tracking-wider tabular-nums sm:block">
            1080×1350 · PNG / ZIP
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => open(addPost())}>
          <PlusIcon data-icon="inline-start" />
          新增貼文
        </Button>
      </header>

      {!hydrated ? (
        /* 貼文在 Supabase，第一次讀完之前不能顯示「還沒有貼文」—— 那是誤報 */
        <Empty className="flex-1 py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner />
            </EmptyMedia>
            <EmptyTitle>讀取貼文…</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : posts.length === 0 ? (
        <Empty className="flex-1 py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayersIcon />
            </EmptyMedia>
            <EmptyTitle>還沒有貼文</EmptyTitle>
            <EmptyDescription>按右上角的「新增貼文」開一份新的版型。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => open(addPost("Vite+ 前端工具鏈全解析", SAMPLE))}
            >
              載入範例貼文
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        /*
          feed 格線，不是檔案列表。

          一組貼文要判斷的是「這些東西擺在一起好不好看」，所以作品要貼著彼此鋪滿，
          中間只留 2px —— 卡片外框、內距、底下兩行說明文字全部拿掉之後，
          畫面上剩下的就只有作品本身。Later 的 Visual Planner 就是這個形態。

          標題也不另外印一遍：封面本來就把大標寫在上面了，
          真正需要細節時 hover 才浮出來。
        */
        <ul className="grid grid-cols-3 gap-0.5 p-0.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {posts.map((post) => (
            <li key={post.id} className="group relative">
              <Link
                href={`/post/${post.id}`}
                aria-label={`開啟「${post.title}」`}
                className="focus-visible:ring-ring/50 rounded-xs relative block overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-3"
              >
                <Cover post={post} />

                {/* IG 用一個疊圖示標示多圖貼文，這裡直接把頁數寫出來 */}
                <span className="pointer-events-none absolute top-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[0.65rem] text-white tabular-nums backdrop-blur-sm">
                  {String(post.slides.length).padStart(2, "0")}
                </span>

                {/*
                  資訊層。桌機 hover 才浮出；觸控沒有 hover，就一直留著。
                  漸層不是裝飾，是讓白字壓在任何封面上都讀得到的遮罩。
                */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/80 to-transparent px-2 pt-8 pb-2 transition-opacity duration-150 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <p className="truncate text-xs font-medium text-white">{post.title}</p>
                  <p className="truncate font-mono text-[0.65rem] tracking-wide text-white/70 tabular-nums">
                    {post.theme === "dark" ? "DARK" : "LIGHT"} · {post.handle}
                  </p>
                </div>
              </Link>

              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={`刪除「${post.title}」`}
                className="bg-background/85 text-muted-foreground hover:text-destructive absolute top-1.5 left-1.5 size-7 shadow-sm backdrop-blur-sm transition-opacity duration-150 focus-visible:opacity-100 md:size-6 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => removePost(post.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
