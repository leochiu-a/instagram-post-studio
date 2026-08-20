"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { parseMarkdown, renumber } from "./markdown";
import { removeImages, removePostImages } from "./image-upload";
import { supabase } from "./supabase";
import type { Post, Slide } from "./types";

export interface PostCollection {
  posts: Record<string, Post>;
  /** 清單的顯示順序，最新的在最前面 */
  order: string[];
  /** 第一次從 Supabase 讀完了沒。false 的時候不能顯示「找不到貼文」 */
  loaded: boolean;
}

/** 新貼文從一張封面起手，清單縮圖才不會是結尾 CTA */
export function createPost(title = "未命名貼文", draft = `# ${title}\n`): Post {
  return {
    id: crypto.randomUUID(),
    title,
    handle: "@leo.web.dev",
    timestamp: "3 min ago",
    theme: "dark",
    slides: parseMarkdown(draft),
    draft,
  };
}

/**
 * 清單頁與編輯器是兩個路由，卻要看同一份資料，所以把集合放在模組層，
 * 用 useSyncExternalStore 訂閱 —— 元件各自持有 state 會讓兩邊各自對 Supabase
 * 寫入時互相蓋掉。
 *
 * 寫入是「先改記憶體、再非同步送出」：編輯器每打一個字都會呼叫 update()，
 * 等 round-trip 回來才更新畫面會直接卡住輸入。
 */
let collection: PostCollection = { posts: {}, order: [], loaded: false };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── 寫回 Supabase ─────────────────────────────────────────────────────────
// 每個 keystroke 送一次 request 會打爆 API，所以累積到 dirty 裡延後合併送出。

const FLUSH_DELAY = 600;
const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), FLUSH_DELAY);
}

async function flush() {
  flushTimer = null;
  const ids = [...dirty];
  dirty.clear();

  const rows = ids
    .map((id) => collection.posts[id])
    .filter((post): post is Post => Boolean(post))
    .map((post) => ({ ...post, updated_at: new Date().toISOString() }));
  if (rows.length === 0) return;

  const { error } = await supabase.from("posts").upsert(rows);
  if (error) {
    // 留在 dirty 裡，下一次編輯或關閉頁面時會再試一次
    for (const id of ids) dirty.add(id);
    toast.error("儲存失敗", { description: error.message });
  }
}

/** 記憶體先更新、畫面先動，再排程寫回 */
function commit(next: Omit<PostCollection, "loaded">, changed?: string) {
  collection = { ...next, loaded: collection.loaded };
  if (changed) {
    dirty.add(changed);
    schedule();
  }
  emit();
}

// ── 讀取 ──────────────────────────────────────────────────────────────────

let loading = false;

async function load() {
  if (loading) return;
  loading = true;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    toast.error("讀取貼文失敗", { description: error.message });
    // 照樣標成 loaded：否則編輯器會永遠停在載入中，連錯誤都看不到
    collection = { ...collection, loaded: true };
    emit();
    return;
  }

  const posts: Record<string, Post> = {};
  for (const row of data) {
    // created_at 只用來排序，不進 Post
    const { created_at: _createdAt, ...post } = row;
    posts[post.id] = post;
  }
  collection = { posts, order: data.map((row) => row.id), loaded: true };
  emit();
}

/**
 * 關掉分頁前把還沒送出的編輯補送出去。debounce 的代價就是最後幾百毫秒的
 * 輸入還在記憶體裡，沒有這一步會掉字。
 */
function flushOnHide() {
  if (document.visibilityState === "hidden" && dirty.size > 0) void flush();
}

function useCollection() {
  useEffect(() => {
    void load();
    document.addEventListener("visibilitychange", flushOnHide);
    return () => document.removeEventListener("visibilitychange", flushOnHide);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => collection,
    () => collection,
  );
}

/** 找不到貼文的畫面只能在第一次讀完之後顯示，不然一進站就會誤報。 */
export function useHydrated() {
  return useCollection().loaded;
}

export function usePostList() {
  const { posts, order } = useCollection();

  const addPost = useCallback((title?: string, draft?: string) => {
    const post = createPost(title, draft);
    commit(
      {
        posts: { ...collection.posts, [post.id]: post },
        order: [post.id, ...collection.order],
      },
      post.id,
    );
    return post.id;
  }, []);

  const removePost = useCallback((id: string) => {
    const rest = { ...collection.posts };
    delete rest[id];
    dirty.delete(id);
    commit({ posts: rest, order: collection.order.filter((each) => each !== id) });

    void (async () => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) {
        toast.error("刪除失敗", { description: error.message });
        return;
      }
      await removePostImages(id);
    })();
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
      commit(
        {
          posts: { ...collection.posts, [id]: { ...target, ...changes } },
          order: collection.order,
        },
        id,
      );
    },
    [id],
  );

  /**
   * 頁面一有變動就重新編號，內頁的頁碼永遠連續。
   *
   * 順便清掉沒人再引用的圖。所有動到 slides 的路徑都經過這裡 —— 換圖、
   * 移除圖、刪一整頁、Markdown 重新套用 —— 所以只要在這個關口比對前後兩份
   * 就夠了，不用在每個變動點各寫一次。
   */
  const setSlides = useCallback(
    (slides: Slide[]) => {
      const before = collection.posts[id]?.slides ?? [];
      update({ slides: renumber(slides) });

      const kept = new Set(slides.map((slide) => slide.imageUrl));
      const orphans = before.map((slide) => slide.imageUrl).filter((url) => url && !kept.has(url));
      if (orphans.length > 0) void removeImages(orphans);
    },
    [update, id],
  );

  return { post, update, setSlides };
}
