import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { ctaOf, parseMarkdown } from "./markdown";
import type { Post, ThemeName } from "./types";

/**
 * 一篇貼文在磁碟上長什麼樣。
 *
 * 檔案就是真相：frontmatter 放 Markdown 表達不了的東西（帳號、配色、結尾 CTA
 * 的四個數字），正文就是使用者在 Markdown 面板裡打的那份草稿。頁面不存 ——
 * 讀檔時用 parseMarkdown 現算，所以不會有「檔案寫著 A、快取的 JSON 寫著 B」
 * 這種兩份資料對不起來的狀況。
 */

const DELIMITER = "---";

export interface PostFileMeta {
  /** 清單排序用。建立時寫進去之後就不再動它 —— 用 mtime 的話每打一個字就會跳到最前面。 */
  created: string;
}

const THEMES: readonly ThemeName[] = ["dark", "light"];

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** 只認得四個數字，多的少的都補成預設的樣子，parseMarkdown 才不會拿到破的 tuple */
function stats(value: unknown): [string, string, string, string] | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  return value.map((each) => text(each)) as [string, string, string, string];
}

/**
 * 把檔案內容切成 frontmatter 與正文。
 * 沒有 frontmatter 的檔案（例如手動丟進來的一份純 Markdown）整份都是正文。
 */
function split(source: string): { frontmatter: string; body: string } {
  const normalized = source.replace(/^﻿/, "");
  if (!normalized.startsWith(`${DELIMITER}\n`)) return { frontmatter: "", body: normalized };

  const end = normalized.indexOf(`\n${DELIMITER}`, DELIMITER.length);
  if (end === -1) return { frontmatter: "", body: normalized };

  const after = normalized.indexOf("\n", end + 1 + DELIMITER.length);
  return {
    frontmatter: normalized.slice(DELIMITER.length + 1, end),
    // frontmatter 與正文之間那個空行是排版，不是內容 —— 留著的話每存一次檔
    // 就會在最前面多長一行
    body: after === -1 ? "" : normalized.slice(after + 1).replace(/^\n+/, ""),
  };
}

export function parsePostFile(id: string, source: string): { post: Post; meta: PostFileMeta } {
  const { frontmatter, body } = split(source);
  const data = (frontmatter ? parseYaml(frontmatter) : null) ?? {};
  const meta = typeof data === "object" ? (data as Record<string, unknown>) : {};
  const cta = (meta.cta ?? {}) as Record<string, unknown>;
  const theme = THEMES.find((each) => each === meta.theme) ?? "dark";

  return {
    post: {
      id,
      // 標題空著就用檔名頂替，清單上才不會出現一格沒有名字的貼文
      title: text(meta.title) || id,
      handle: text(meta.handle),
      timestamp: text(meta.timestamp),
      theme,
      draft: body,
      slides: parseMarkdown(body, {
        subhead: text(cta.subhead) || undefined,
        headline: text(cta.headline) || undefined,
        stats: stats(cta.stats),
        imageUrl: text(cta.image) || undefined,
      }),
    },
    meta: { created: text(meta.created) },
  };
}

export function serializePostFile(post: Post, meta: PostFileMeta): string {
  const cta = ctaOf(post.slides);
  const frontmatter = stringifyYaml(
    {
      title: post.title,
      handle: post.handle,
      timestamp: post.timestamp,
      theme: post.theme,
      created: meta.created,
      ...(cta && {
        cta: {
          subhead: cta.subhead,
          headline: cta.headline,
          stats: cta.stats,
          image: cta.imageUrl,
        },
      }),
    },
    // 一行一個欄位，中文不折行 —— 這份 frontmatter 是要給人在編輯器裡直接改的
    { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN", lineWidth: 0 },
  ).replace(/\n$/, "");

  // 正文用 draft 而不是 toMarkdown(slides)：使用者在 Markdown 面板打的那份才是
  // 正本，重新序列化會改掉他刻意留的空行與符號。逐頁編輯那條路本來就會先把
  // draft 換成 toMarkdown 的結果，所以兩邊寫出去的都是同一份東西。
  const body = post.draft.replace(/^\n+/, "").replace(/\n*$/, "\n");
  return `${DELIMITER}\n${frontmatter}\n${DELIMITER}\n\n${body}`;
}

/** 空白的一篇。建立時只有一張封面，清單縮圖才不會是結尾 CTA。 */
export const emptyDraft = (title: string) => `# ${title}\n`;

/**
 * 標題轉檔名。中文原樣保留 —— 這個資料夾是給人直接開來看的，
 * 一整排 untitled-2026-08-30 沒有任何意義。
 */
export function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replaceAll(/[\s_]+/g, "-")
    .replaceAll(/[^a-z0-9一-鿿-]/gu, "")
    .replaceAll(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "untitled";
}
