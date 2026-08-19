"use client";

import { LayersIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlideCard } from "./slide-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { usePostList } from "@/lib/post-store";
import { CANVAS } from "@/lib/theme";
import { useFitScale } from "@/lib/use-fit-scale";
import type { Post } from "@/lib/types";

/** 卡片縮圖：直接縮放真正的版型，不另外做一套假的預覽 */
function Thumbnail({ post }: { post: Post }) {
  const cover = post.slides[0];
  // 一格再寬也不需要超過原尺寸的一半
  const { ref, scale } = useFitScale(0.5, 0.22);

  return (
    <div
      ref={ref}
      className="bg-muted ring-border group-hover:ring-muted-foreground/40 w-full overflow-hidden rounded-sm shadow-[0_1px_2px_rgb(0_0_0/0.4),0_10px_28px_-14px_rgb(0_0_0/0.7)] ring-1 transition-[--tw-ring-color] duration-100"
      style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}` }}
    >
      {cover && (
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <SlideCard
            slide={cover}
            handle={post.handle}
            timestamp={post.timestamp}
            theme={post.theme}
          />
        </div>
      )}
    </div>
  );
}

export function PostList() {
  const { posts, addPost, removePost } = usePostList();
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-6">
      <header className="flex items-end justify-between gap-4 pb-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold">IG Post Studio</h1>
          <p className="text-muted-foreground font-mono text-xs tracking-wide tabular-nums">
            1080 × 1350 · PNG / ZIP · DARK + LIGHT
          </p>
        </div>
        <Button size="lg" onClick={() => router.push(`/post/${addPost()}`)}>
          ＋ 新增貼文
        </Button>
      </header>

      <Separator />

      {posts.length === 0 ? (
        <Empty className="py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayersIcon />
            </EmptyMedia>
            <EmptyTitle>還沒有貼文</EmptyTitle>
            <EmptyDescription>按右上角的「新增貼文」開一份新的版型。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 pt-6 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <li key={post.id} className="group relative flex flex-col">
              <Link
                href={`/post/${post.id}`}
                className="focus-visible:ring-ring/50 flex flex-col gap-2.5 rounded-sm outline-none focus-visible:ring-3"
              >
                <Thumbnail post={post} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">{post.title}</p>
                  <p className="text-muted-foreground truncate font-mono text-[0.7rem] tracking-wide tabular-nums">
                    {String(post.slides.length).padStart(2, "0")}P ·{" "}
                    {post.theme === "dark" ? "DARK" : "LIGHT"} · {post.handle}
                  </p>
                </div>
              </Link>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="刪除"
                className="bg-background/85 text-muted-foreground hover:text-destructive absolute size-8 md:size-6 top-1.5 right-1.5 backdrop-blur-sm transition-opacity duration-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => removePost(post.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
