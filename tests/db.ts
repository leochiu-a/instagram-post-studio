import { loadEnvConfig } from "@next/env";
import { test as base } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { POST } from "./fixture";
import type { Post } from "../src/lib/types";

// 測試跑在 Node，不經過 Next 的 runtime，所以要自己把 .env.local 讀進來。
loadEnvConfig(process.cwd(), true);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error("E2E 需要 Supabase 設定：把 .env.example 複製成 .env.local 並填入專案的值。");
}

const db = createClient(url, anonKey, { auth: { persistSession: false } });

/**
 * 每個 test 自己的資料。
 *
 * posts 表現在是全域共用的（還沒有 Auth，也就沒有 per-user 的資料範圍），
 * 所以測試不能假設「清單上只有我這一篇」，也絕對不能清空整張表 ——
 * .env.local 指到誰的專案都有可能。折衷做法是：每個 test 用自己的 uuid 與
 * 專屬 tag，收尾只刪自己造出來的那幾列。
 */
export interface Fixture {
  /** 建一篇測試貼文，回傳它（id 是這個 test 專屬的） */
  seed: (overrides?: Partial<Post>) => Promise<Post>;
  /** 這個 test 專屬的字串。透過 UI 建立的貼文要把它放進標題，收尾才刪得掉 */
  tag: string;
  /** 直接讀資料庫，用來驗「真的寫進去了」 */
  read: (id: string) => Promise<Post | null>;
  /** 這篇貼文在 bucket 裡的圖有哪些（檔名） */
  images: (postId: string) => Promise<string[]>;
}

export const test = base.extend<{ app: Fixture }>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright 靠第一個參數的解構決定依賴哪些 fixture，空解構代表「不依賴任何 fixture」，不能改寫成 _deps
  app: async ({}, use, testInfo) => {
    const tag = `e2e-${testInfo.testId}-${testInfo.repeatEachIndex}`;
    const ids: string[] = [];

    const seed = async (overrides?: Partial<Post>) => {
      // 標題帶上 tag：清單上會有別的 test 的貼文，選取器要指得到自己這一篇
      const post: Post = {
        ...POST,
        ...overrides,
        title: `${overrides?.title ?? POST.title} ${tag}`,
        id: crypto.randomUUID(),
      };
      ids.push(post.id);
      const { error } = await db.from("posts").insert(post);
      if (error) throw new Error(`seed 失敗：${error.message}`);
      return post;
    };

    const read = async (id: string) => {
      const { data } = await db.from("posts").select("*").eq("id", id).maybeSingle();
      return (data as Post | null) ?? null;
    };

    const images = async (postId: string) => {
      const { data } = await db.storage.from("post-images").list(postId);
      return (data ?? []).map((file) => file.name).toSorted();
    };

    await use({ seed, tag, read, images });

    if (ids.length > 0) {
      await db.from("posts").delete().in("id", ids);
      // 圖平常是隨著 UI 刪貼文一起清的（removePostImages），
      // 這裡繞過 UI 直接刪列，所以要自己把 bucket 裡的圖收掉
      for (const id of ids) {
        const { data } = await db.storage.from("post-images").list(id);
        if (data?.length) {
          await db.storage.from("post-images").remove(data.map((file) => `${id}/${file.name}`));
        }
      }
    }
    // 透過 UI 建的貼文 id 是瀏覽器產的，這邊不知道，只能靠標題裡的 tag 找
    await db.from("posts").delete().like("title", `%${tag}%`);
  },
});

export { expect } from "@playwright/test";
