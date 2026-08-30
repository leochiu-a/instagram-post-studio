import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  emptyDraft,
  parsePostFile,
  type PostFileMeta,
  serializePostFile,
  slugify,
} from "./post-file";
import type { Post } from "./types";

/**
 * 貼文與圖片在磁碟上的全部操作，綁在專案根目錄底下。
 *
 * 這裡沒有任何一個函式收「路徑」—— 只收 slug 或檔名，而且兩者都先過格式檢查，
 * 所以就算 request 帶了 `../../.ssh/id_rsa` 也走不出下面這兩個資料夾。
 */

const POSTS_DIR = "content/posts";
const IMAGES_DIR = "public/post-images";
const IMAGES_PUBLIC_PATH = "/post-images";

/**
 * 檔名允許中文（CJK 統一表意文字），因為 slug 是從標題來的，
 * 只留 ASCII 的話一整個資料夾都會是 untitled-1、untitled-2。
 */
const SLUG = /^[a-z0-9一-鿿]+(?:-[a-z0-9一-鿿]+)*$/u;
const IMAGE_FILE = /^[a-z0-9-]+\.(webp|png|jpe?g|gif|svg)$/;
const IMAGE_EXTENSIONS = new Set(["webp", "png", "jpg", "jpeg", "gif", "svg"]);

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

function assertSlug(slug: string): string {
  if (!SLUG.test(slug)) throw new StoreError(`不合法的貼文代號：${JSON.stringify(slug)}`, 400);
  return slug;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function createPostFiles(root: string) {
  const postsDir = join(root, POSTS_DIR);
  const imagesDir = join(root, IMAGES_DIR);
  const postPath = (slug: string) => join(postsDir, `${assertSlug(slug)}.md`);

  async function read(slug: string): Promise<{ post: Post; meta: PostFileMeta }> {
    const path = postPath(slug);
    if (!(await exists(path))) throw new StoreError(`找不到貼文：${slug}`, 404);
    return parsePostFile(slug, await readFile(path, "utf8"));
  }

  /** 清單：新的在前。排序鍵是 frontmatter 的 created，不是檔案的 mtime。 */
  async function list(): Promise<Post[]> {
    if (!(await exists(postsDir))) return [];
    const names = await readdir(postsDir);
    const entries = await Promise.all(
      names
        .filter((name) => name.endsWith(".md"))
        .map((name) => read(name.slice(0, -3)).catch(() => null)),
    );
    return entries
      .filter((entry): entry is { post: Post; meta: PostFileMeta } => entry !== null)
      .toSorted((a, b) => b.meta.created.localeCompare(a.meta.created))
      .map((entry) => entry.post);
  }

  /**
   * 存檔只會蓋掉已經存在的貼文；新的一律走 create。
   * 少了這道檢查，一個打錯的 slug 就會憑空長出一個檔案。
   */
  async function write(slug: string, post: Post): Promise<Post> {
    const { meta } = await read(slug);
    await writeFile(postPath(slug), serializePostFile({ ...post, id: slug }, meta), "utf8");
    return { ...post, id: slug };
  }

  /**
   * 檔名由標題決定，撞名就加序號。之後改標題不會改檔名 ——
   * 網址與圖片資料夾都掛在它身上，重新命名等於把每一張圖的路徑都弄丟。
   */
  async function create(title: string, draft?: string): Promise<Post> {
    await mkdir(postsDir, { recursive: true });

    const base = slugify(title);
    let slug = base;
    for (let suffix = 2; await exists(postPath(slug)); suffix += 1) slug = `${base}-${suffix}`;

    const source = draft ?? emptyDraft(title);
    const { post } = parsePostFile(slug, source);
    const created = new Date().toISOString();
    await writeFile(
      postPath(slug),
      serializePostFile(
        { ...post, title, handle: "@leo.web.dev", timestamp: "3 min ago" },
        {
          created,
        },
      ),
      "utf8",
    );
    return (await read(slug)).post;
  }

  /** 刪貼文連它整個圖片資料夾一起收掉，public/ 才不會一直長。 */
  async function remove(slug: string): Promise<void> {
    const path = postPath(slug);
    if (!(await exists(path))) throw new StoreError(`找不到貼文：${slug}`, 404);
    await rm(path);
    await rm(join(imagesDir, slug), { recursive: true, force: true });
  }

  async function saveImage(slug: string, extension: string, bytes: Uint8Array): Promise<string> {
    assertSlug(slug);
    if (!IMAGE_EXTENSIONS.has(extension)) {
      throw new StoreError(`不支援的圖片格式：${JSON.stringify(extension)}`, 400);
    }

    const directory = join(imagesDir, slug);
    await mkdir(directory, { recursive: true });
    const name = `${crypto.randomUUID()}.${extension}`;
    await writeFile(join(directory, name), bytes);
    return `${IMAGES_PUBLIC_PATH}/${slug}/${name}`;
  }

  /**
   * 刪掉一批不再被引用的圖。
   *
   * 沒有這一步，換一次圖就漏一個檔：換圖只會改 slide 的 imageUrl，
   * 舊檔案還躺在 public/ 裡沒人指向它。只認自己這篇的路徑，
   * 別篇的圖或外部網址一律略過。
   */
  async function removeImages(slug: string, urls: string[]): Promise<void> {
    assertSlug(slug);
    const prefix = `${IMAGES_PUBLIC_PATH}/${slug}/`;
    const names = urls
      .filter((url) => url.startsWith(prefix))
      .map((url) => url.slice(prefix.length))
      .filter((name) => IMAGE_FILE.test(name));

    await Promise.all(names.map((name) => rm(join(imagesDir, slug, name), { force: true })));
  }

  return { read, list, write, create, remove, saveImage, removeImages };
}

export const postFiles = createPostFiles(process.cwd());
