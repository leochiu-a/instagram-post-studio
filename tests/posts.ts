import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test as base } from "@playwright/test";
import { BODY, CTA, HANDLE, TIMESTAMP, TITLE } from "./fixture";
import { parsePostFile, serializePostFile } from "../src/lib/post-file";
import { parseMarkdown } from "../src/lib/markdown";
import type { Post } from "../src/lib/types";

/**
 * 每個 test 自己的檔案。
 *
 * 貼文現在是 content/posts 底下的 .md，而那個資料夾裡通常也有真正在寫的貼文，
 * 所以測試絕對不能清空它。折衷做法是：每個 test 用自己的專屬 tag，收尾只刪
 * 檔名或標題帶著那個 tag 的檔案。
 */
const POSTS_DIR = join(process.cwd(), "content/posts");
const IMAGES_DIR = join(process.cwd(), "public/post-images");

export interface Fixture {
  /** 建一篇測試貼文，回傳它（檔名是這個 test 專屬的） */
  seed: (overrides?: { title?: string; draft?: string }) => Promise<Post>;
  /** 這個 test 專屬的字串。透過 UI 建立的貼文要把它放進標題，收尾才刪得掉 */
  tag: string;
  /** 直接讀檔，用來驗「真的存進去了」 */
  read: (id: string) => Promise<Post | null>;
  /** 這篇貼文的圖片資料夾裡有哪些檔案 */
  images: (id: string) => Promise<string[]>;
}

async function readPost(id: string): Promise<Post | null> {
  try {
    return parsePostFile(id, await readFile(join(POSTS_DIR, `${id}.md`), "utf8")).post;
  } catch {
    return null;
  }
}

export const test = base.extend<{ app: Fixture }>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright 靠第一個參數的解構決定依賴哪些 fixture，空解構代表「不依賴任何 fixture」，不能改寫成 _deps
  app: async ({}, use, testInfo) => {
    const tag = `e2e-${testInfo.testId}-${testInfo.repeatEachIndex}`
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]/g, "-");

    const seed = async (overrides?: { title?: string; draft?: string }) => {
      const draft = overrides?.draft ?? BODY;
      const post: Post = {
        id: tag,
        // 標題帶上 tag：清單上會有別的 test 的貼文，選取器要指得到自己這一篇
        title: `${overrides?.title ?? TITLE} ${tag}`,
        handle: HANDLE,
        timestamp: TIMESTAMP,
        theme: "dark",
        draft,
        slides: parseMarkdown(draft, CTA),
      };

      await mkdir(POSTS_DIR, { recursive: true });
      await writeFile(
        join(POSTS_DIR, `${post.id}.md`),
        serializePostFile(post, { created: new Date().toISOString() }),
        "utf8",
      );
      return (await readPost(post.id))!;
    };

    const images = async (id: string) => {
      try {
        return (await readdir(join(IMAGES_DIR, id))).toSorted();
      } catch {
        return [];
      }
    };

    await use({ seed, tag, read: readPost, images });

    // 收尾：檔名帶 tag 的（seed 建的）與標題帶 tag 的（透過 UI 建的，檔名是
    // 從「未命名貼文」轉出來的，認不出來）都要刪掉，連同它們的圖片資料夾
    const names = await readdir(POSTS_DIR).catch(() => []);
    for (const name of names) {
      if (!name.endsWith(".md")) continue;
      const id = name.slice(0, -3);
      const post = await readPost(id);
      if (!id.includes(tag) && !post?.title.includes(tag)) continue;
      await rm(join(POSTS_DIR, name), { force: true });
      await rm(join(IMAGES_DIR, id), { recursive: true, force: true });
    }
  },
});

export { expect } from "@playwright/test";
