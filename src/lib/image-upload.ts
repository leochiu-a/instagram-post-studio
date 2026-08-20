import { IMAGE_BUCKET, supabase } from "./supabase";

/**
 * 長邊上限。最大的版位是封面橫幅 937.76 寬（見 theme.ts 的 METRICS），
 * 2x 是 1876，取 2000 就綽綽有餘 —— 再大只是佔著 Storage 額度而已。
 */
const MAX_EDGE = 2000;
const WEBP_QUALITY = 0.85;

/**
 * 副檔名跟著實際的 blob type 走，不是跟著使用者選的檔名。
 * 轉檔失敗會 fallback 成 png，兩者一旦對不上，Storage 的 content-type 就錯了。
 */
function extensionOf(type: string) {
  const subtype = type.split("/")[1] ?? "png";
  return subtype === "svg+xml" ? "svg" : subtype;
}

/**
 * 上傳前先轉成 WebP 並縮到版位用得到的尺寸。
 *
 * 為什麼在這裡做，而不是交給 next/image 或 Supabase 的 image transformation：
 * 版型是寫死 1080×1350 的渲染目標，匯出時 html-to-image 要把圖 fetch 回來畫進
 * canvas —— srcset 讓瀏覽器自己挑尺寸、lazy loading 讓圖可能還沒載，兩件事都
 * 會讓匯出結果不可預期。Supabase 的 transformation 則是 Pro 方案才有的功能。
 * 上傳時轉一次、存最終形態，這些問題就都不存在。
 */
async function toWebp(file: File): Promise<Blob> {
  // SVG 是向量，光柵化只會變小又變醜，原樣存
  if (file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("拿不到 canvas context");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // 不支援 webp 編碼的瀏覽器會默默給你 png，所以回傳值的 type 才是真相
  return canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
}

/**
 * 把圖轉檔後上傳到 post-images，回傳公開網址。
 * 用貼文 id 當資料夾，之後刪貼文要一併清圖時可以整個 prefix 掃掉。
 */
export async function uploadImage(file: File, postId: string): Promise<string> {
  const blob = await toWebp(file);
  const path = `${postId}/${crypto.randomUUID()}.${extensionOf(blob.type)}`;

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
  });
  if (error) throw error;

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 從公開網址反推 bucket 裡的路徑。不是我們的網址就回 null。 */
function pathOf(url: string) {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : url.slice(at + marker.length);
}

/**
 * 刪掉一批不再被引用的圖。
 *
 * 沒有這一步，換一次圖就漏一個檔：換圖只會改 slide 的 imageUrl，
 * 舊物件還躺在 bucket 裡沒人指向它 —— 免費方案那 1GB 就是這樣被吃掉的。
 */
export async function removeImages(urls: string[]) {
  const paths = urls.map(pathOf).filter((path): path is string => path !== null);
  if (paths.length === 0) return;
  await supabase.storage.from(IMAGE_BUCKET).remove(paths);
}

/** 貼文刪掉時把它整個資料夾的圖也清掉，bucket 才不會一直長。 */
export async function removePostImages(postId: string) {
  const { data } = await supabase.storage.from(IMAGE_BUCKET).list(postId);
  if (!data?.length) return;
  await supabase.storage.from(IMAGE_BUCKET).remove(data.map((file) => `${postId}/${file.name}`));
}

/** 是不是我們自己 bucket 的圖 —— 這些網址有 CORS 標頭，匯出不會失敗。 */
export function isManagedImage(url: string) {
  return url.includes(`/storage/v1/object/public/${IMAGE_BUCKET}/`);
}
