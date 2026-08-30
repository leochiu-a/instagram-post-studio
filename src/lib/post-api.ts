import { type createPostFiles, StoreError } from "./post-files";
import type { Post, Slide, ThemeName } from "./types";

/**
 * Route handler 的實作。store 是參數而不是 import 進來的單例，
 * 所以 route 檔案都只有一行，而這裡的行為不用起 server 就測得動。
 */
type Files = ReturnType<typeof createPostFiles>;

async function respond(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof StoreError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

function badRequest(message: string): never {
  throw new StoreError(message, 400);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) badRequest("body 要是一個 JSON 物件");
  return body as Record<string, unknown>;
}

const THEMES: readonly ThemeName[] = ["dark", "light"];

/**
 * 進來的 body 當成外部輸入檢查一遍。序列化只讀得到這幾個欄位
 * （加上頁面裡的那張 CTA），所以檢查的範圍就是它們。
 */
function asPost(value: unknown): Post {
  const post = value as Post | null;
  if (
    typeof post !== "object" ||
    post === null ||
    typeof post.title !== "string" ||
    typeof post.handle !== "string" ||
    typeof post.timestamp !== "string" ||
    typeof post.draft !== "string" ||
    !THEMES.includes(post.theme) ||
    !Array.isArray(post.slides as Slide[])
  ) {
    badRequest("body 不是一篇貼文");
  }
  return post;
}

export function listPosts(files: Files): Promise<Response> {
  return respond(async () => Response.json(await files.list()));
}

export function createPost(request: Request, files: Files): Promise<Response> {
  return respond(async () => {
    const body = await readJson(request);
    const title = typeof body.title === "string" ? body.title : "未命名貼文";
    const draft = typeof body.draft === "string" ? body.draft : undefined;
    return Response.json(await files.create(title, draft), { status: 201 });
  });
}

export function savePost(slug: string, request: Request, files: Files): Promise<Response> {
  return respond(async () => {
    const body = await readJson(request);
    return Response.json(await files.write(slug, asPost(body.post)));
  });
}

export function deletePost(slug: string, files: Files): Promise<Response> {
  return respond(async () => {
    await files.remove(slug);
    return Response.json({ id: slug });
  });
}

/** 圖已經在瀏覽器轉成 WebP 了（見 image-upload.ts），這裡只負責落檔。 */
export function uploadImage(slug: string, request: Request, files: Files): Promise<Response> {
  return respond(async () => {
    const data = await request.formData().catch(() => null);
    const file = data?.get("file");
    if (!(file instanceof File)) badRequest("要有一個檔案");

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const src = await files.saveImage(slug, extension, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ src }, { status: 201 });
  });
}

export function deleteImages(slug: string, request: Request, files: Files): Promise<Response> {
  return respond(async () => {
    const body = await readJson(request);
    if (!Array.isArray(body.urls)) badRequest("urls 要是一個陣列");
    const urls = body.urls.filter((url): url is string => typeof url === "string");
    await files.removeImages(slug, urls);
    return Response.json({ removed: urls.length });
  });
}
