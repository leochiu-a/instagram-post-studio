"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlideCard } from "./slide-card";
import { Button } from "./ui";
import { usePostList } from "@/lib/post-store";
import { CANVAS } from "@/lib/theme";
import type { Post } from "@/lib/types";

/** 清單縮圖：直接縮放真正的版型，不另外做一套假的預覽 */
const SCALE = 0.16;

function Thumbnail({ post }: { post: Post }) {
  const cover = post.slides[0];
  return (
    <div
      className="shrink-0 overflow-hidden rounded-lg bg-neutral-900 ring-1 ring-white/10"
      style={{ width: CANVAS.width * SCALE, height: CANVAS.height * SCALE }}
    >
      {cover && (
        <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-lg font-semibold">IG Post Studio</h1>
          <p className="text-xs text-neutral-400">1080×1350 · 深淺兩色版型</p>
        </div>
        <Button variant="primary" onClick={() => router.push(`/post/${addPost()}`)}>
          ＋ 新增貼文
        </Button>
      </header>

      {posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-400">
          還沒有貼文，按右上角的「新增貼文」開始。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-center gap-4 rounded-xl bg-neutral-900/60 p-3 ring-1 ring-white/10 transition hover:ring-white/30"
            >
              <Link href={`/post/${post.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <Thumbnail post={post} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{post.title}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {post.slides.length} 頁 · {post.theme === "dark" ? "深色" : "淺色"} ·{" "}
                    {post.handle}
                  </p>
                </div>
              </Link>
              <Button variant="danger" onClick={() => removePost(post.id)}>
                刪除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
