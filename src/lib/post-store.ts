"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { parseMarkdown, renumber, SAMPLE } from "./markdown";
import type { Post, Slide } from "./types";

/** 全新的 key：不讀舊版的單篇資料，也不做任何轉換。 */
const STORAGE_KEY = "ig-post-studio:posts:v1";

export interface PostCollection {
  posts: Record<string, Post>;
  /** 清單的顯示順序，最新的在最前面 */
  order: string[];
}

/** 新貼文從一張封面起手，清單縮圖才不會是結尾 CTA */
export function createPost(title = "未命名貼文", draft = `# ${title}\n`): Post {
  return {
    // 使用者按下「新增」才會呼叫，只在瀏覽器跑，可以放心用隨機 id
    id: crypto.randomUUID(),
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
  return { posts: { [post.id]: post }, order: [post.id] };
}

function readCollection(): PostCollection | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PostCollection;
    if (!Array.isArray(parsed.order) || !parsed.posts) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 清單頁與編輯器是兩個路由，卻要看同一份資料，所以把集合放在模組層，
 * 用 useSyncExternalStore 訂閱 —— 元件各自持有 state 會讓兩邊寫回 localStorage 時互相覆蓋。
 *
 * hydrated 旗標同樣關鍵：還沒把 localStorage 讀進來之前絕對不能寫回去，
 * 否則掛載當下的持久化會先用記憶體裡的預設值蓋掉真正的資料。
 */
let collection = defaultCollection();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const stored = readCollection();
  if (stored) {
    collection = stored;
    emit();
  }
}

function commit(next: PostCollection) {
  collection = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

function useCollection() {
  useEffect(hydrate, []);
  return useSyncExternalStore(
    subscribe,
    () => collection,
    () => collection,
  );
}

/** 找不到貼文的畫面只能在還原完 localStorage 之後顯示，不然一進站就會誤報。 */
export function useHydrated() {
  const [ready, setReady] = useState(false);
  // oxlint-disable-next-line react/set-state-in-effect -- localStorage 在 SSR 讀不到，只能掛載後才算還原完
  useEffect(() => setReady(true), []);
  return ready;
}

export function usePostList() {
  const { posts, order } = useCollection();

  const addPost = useCallback(() => {
    const post = createPost();
    commit({
      posts: { ...collection.posts, [post.id]: post },
      order: [post.id, ...collection.order],
    });
    return post.id;
  }, []);

  const removePost = useCallback((id: string) => {
    const rest = { ...collection.posts };
    delete rest[id];
    commit({ posts: rest, order: collection.order.filter((each) => each !== id) });
  }, []);

  return {
    posts: order.map((id) => posts[id]).filter((post): post is Post => Boolean(post)),
    addPost,
    removePost,
  };
}

export function usePost(id: string) {
  const { posts } = useCollection();
  const post = posts[id];

  const update = useCallback(
    (changes: Partial<Omit<Post, "id">>) => {
      const target = collection.posts[id];
      if (!target) return;
      commit({
        ...collection,
        posts: { ...collection.posts, [id]: { ...target, ...changes } },
      });
    },
    [id],
  );

  /** 頁面一有變動就重新編號，內頁的頁碼永遠連續 */
  const setSlides = useCallback(
    (slides: Slide[]) => update({ slides: renumber(slides) }),
    [update],
  );

  return { post, update, setSlides };
}
