"use client";

import { useCallback, useEffect, useState } from "react";
import { parseMarkdown, renumber, SAMPLE } from "./markdown";
import { newId, type Post, type Slide } from "./types";

/** 全新的 key：不讀舊版的單篇資料，也不做任何轉換。 */
const STORAGE_KEY = "ig-post-studio:posts:v1";

export interface PostCollection {
  /** 以貼文 id 為 key，之後要支援多篇時不必改形狀 */
  posts: Record<string, Post>;
  currentId: string;
}

export function createPost(title = "未命名貼文", draft = ""): Post {
  return {
    id: newId(),
    title,
    handle: "@leo.web.dev",
    timestamp: "3 min ago",
    theme: "dark",
    slides: parseMarkdown(draft),
    draft,
  };
}

/** 伺服器與瀏覽器都算得出同一份初始資料，才不會 hydration mismatch。 */
function defaultCollection(): PostCollection {
  const post: Post = { ...createPost("Vite+ 前端工具鏈全解析", SAMPLE), id: "p" };
  return { posts: { [post.id]: post }, currentId: post.id };
}

function readCollection(): PostCollection | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PostCollection;
    if (!parsed.posts?.[parsed.currentId]) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 貼文集合的單一入口。
 *
 * 關鍵在 hydrated 這個旗標：還沒把 localStorage 讀進來之前絕對不能寫回去。
 * 少了它，掛載當下的持久化會先用記憶體裡的預設值覆蓋掉真正的資料，
 * StrictMode 的二次掛載再讀就只剩預設值 —— 使用者的內容會在重新整理後消失。
 */
export function usePostCollection() {
  const [collection, setCollection] = useState<PostCollection>(defaultCollection);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readCollection();
    // oxlint-disable-next-line react/set-state-in-effect -- localStorage 在 SSR 讀不到，只能掛載後還原
    if (stored) setCollection(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  }, [collection, hydrated]);

  const current = collection.posts[collection.currentId];

  const updateCurrent = useCallback((changes: Partial<Omit<Post, "id">>) => {
    setCollection((prev) => {
      const post = prev.posts[prev.currentId];
      return { ...prev, posts: { ...prev.posts, [post.id]: { ...post, ...changes } } };
    });
  }, []);

  /** 頁面一有變動就重新編號，內頁的頁碼永遠連續 */
  const setSlides = useCallback(
    (slides: Slide[]) => updateCurrent({ slides: renumber(slides) }),
    [updateCurrent],
  );

  return { current, updateCurrent, setSlides, hydrated };
}
