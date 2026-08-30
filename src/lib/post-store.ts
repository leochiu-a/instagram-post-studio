"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { request } from "./api-client";
import { removeImages } from "./image-upload";
import { renumber, toMarkdown } from "./markdown";
import type { Post, Slide } from "./types";

export interface PostCollection {
  posts: Record<string, Post>;
  /** 清單的顯示順序，最新的在最前面 */
  order: string[];
  /** 第一次讀完 content/posts 了沒。false 的時候不能顯示「找不到貼文」 */
  loaded: boolean;
}

/**
 * 清單頁與編輯器是兩個路由，卻要看同一份資料，所以把集合放在模組層，
 * 用 useSyncExternalStore 訂閱 —— 元件各自持有 state 會讓兩邊各自存檔時互相蓋掉。
 *
 * 寫入是「先改記憶體、再非同步存檔」：編輯器每打一個字都會呼叫 update()，
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

// ── 寫回磁碟 ──────────────────────────────────────────────────────────────
// 每個 keystroke 存一次檔會讓 dev server 一直重讀，所以累積到 dirty 裡延後合併送出。

const FLUSH_DELAY = 600;
const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), FLUSH_DELAY);
}

async function flush(keepalive = false) {
  flushTimer = null;
  const ids = [...dirty];
  dirty.clear();

  await Promise.all(
    ids.map(async (id) => {
      const post = collection.posts[id];
      if (!post) return;
      try {
        await request(`/api/posts/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ post }),
          keepalive,
        });
      } catch (error) {
        // 留在 dirty 裡，下一次編輯或關閉頁面時會再試一次
        dirty.add(id);
        toast.error("存檔失敗", { description: (error as Error).message });
      }
    }),
  );
}

/** 記憶體先更新、畫面先動，再排程存檔 */
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

  try {
    const data = await request<Post[]>("/api/posts");
    const posts: Record<string, Post> = {};
    for (const post of data) posts[post.id] = post;
    collection = { posts, order: data.map((post) => post.id), loaded: true };
  } catch (error) {
    toast.error("讀取貼文失敗", { description: (error as Error).message });
    // 照樣標成 loaded：否則編輯器會永遠停在載入中，連錯誤都看不到
    collection = { ...collection, loaded: true };
  }
  emit();
}

/**
 * 關掉分頁前把還沒存的編輯補送出去。debounce 的代價就是最後幾百毫秒的
 * 輸入還在記憶體裡，沒有這一步會掉字 —— keepalive 讓 request 在分頁
 * 關掉之後仍然送得完。
 */
function flushOnHide() {
  if (document.visibilityState === "hidden" && dirty.size > 0) void flush(true);
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

  /**
   * 檔名由 server 決定（標題轉 slug、撞名加序號），所以新增是等 round-trip
   * 回來才拿得到 id —— 這是這裡唯一一個不能樂觀更新的操作。
   */
  const addPost = useCallback(async (title = "未命名貼文", draft?: string) => {
    const post = await request<Post>("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, draft }),
    });
    commit({
      posts: { ...collection.posts, [post.id]: post },
      order: [post.id, ...collection.order],
    });
    return post.id;
  }, []);

  const removePost = useCallback((id: string) => {
    const rest = { ...collection.posts };
    delete rest[id];
    dirty.delete(id);
    commit({
      posts: rest,
      order: collection.order.filter((each) => each !== id),
    });

    // 檔案與它整個圖片資料夾都由 server 收掉
    void request(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      (error: Error) => toast.error("刪除失敗", { description: error.message }),
    );
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
   * 頁面一有變動就重新編號，內頁的頁碼永遠連續。逐頁改動時順便把 Markdown
   * 草稿重新生成 —— 草稿就是磁碟上那份檔案的正文，所以這一步不只是同步兩個
   * 編輯模式，它決定了存進去的是什麼。
   *
   * 但 Markdown 面板自己套用時要傳 syncDraft: false：那條路的草稿就是使用者
   * 正在打的字，回寫等於把 textarea 的內容換成重新序列化的版本 —— 游標會被
   * 踢到最後，還會順手改掉他寫的空行與符號。誰在編輯，誰就是 source of truth。
   *
   * 順便清掉沒人再引用的圖。所有動到 slides 的路徑都經過這裡 —— 換圖、
   * 移除圖、刪一整頁、Markdown 重新套用 —— 所以只要在這個關口比對前後兩份
   * 就夠了，不用在每個變動點各寫一次。
   */
  const setSlides = useCallback(
    (slides: Slide[], { syncDraft = true }: { syncDraft?: boolean } = {}) => {
      const before = collection.posts[id]?.slides ?? [];
      const renumbered = renumber(slides);
      update(
        syncDraft ? { slides: renumbered, draft: toMarkdown(renumbered) } : { slides: renumbered },
      );

      const kept = new Set(slides.map((slide) => slide.imageUrl));
      const orphans = before.map((slide) => slide.imageUrl).filter((url) => url && !kept.has(url));
      if (orphans.length > 0) void removeImages(id, orphans);
    },
    [update, id],
  );

  return { post, update, setSlides };
}
