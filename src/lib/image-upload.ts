import { request } from "./api-client";

/**
 * 長邊上限。最大的版位是封面橫幅 937.76 寬（見 theme.ts 的 METRICS），
 * 2x 是 1876，取 2000 就綽綽有餘 —— 再大只是佔著硬碟而已。
 */
const MAX_EDGE = 2000;
const WEBP_QUALITY = 0.85;

/**
 * 副檔名跟著實際的 blob type 走，不是跟著使用者選的檔名。
 * 轉檔失敗會 fallback 成 png，兩者一旦對不上，落到磁碟的副檔名就錯了。
 */
function extensionOf(type: string) {
  const subtype = type.split("/")[1] ?? "png";
  return subtype === "svg+xml" ? "svg" : subtype;
}

/**
 * 上傳前先轉成 WebP 並縮到版位用得到的尺寸。
 *
 * 為什麼在瀏覽器做，而不是把原檔丟給 server 用 sharp 轉：
 * 這一步只是把「使用者選的任意大圖」壓成版型真正用得到的尺寸，
 * canvas 就做得到，沒必要為它多背一個原生相依。
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
 * 把圖轉檔後寫進 public/post-images/<貼文>/，回傳相對路徑。
 *
 * 用貼文當資料夾，刪貼文時整個目錄一起收掉就好；存相對路徑則是為了
 * 匯出：modern-screenshot 要把圖 fetch 回來畫進 canvas，同源的路徑
 * 不會有 CORS 問題，換一台機器打開專案也還指得到同一張圖。
 */
export async function uploadImage(file: File, postId: string): Promise<string> {
  const blob = await toWebp(file);
  const body = new FormData();
  body.append("file", new File([blob], `image.${extensionOf(blob.type)}`, { type: blob.type }));

  const { src } = await request<{ src: string }>(
    `/api/posts/${encodeURIComponent(postId)}/images`,
    {
      method: "POST",
      body,
    },
  );
  return src;
}

/**
 * 刪掉一批不再被引用的圖。
 *
 * 沒有這一步，換一次圖就漏一個檔：換圖只會改 slide 的 imageUrl，
 * 舊檔案還躺在 public/ 裡沒人指向它。
 */
export async function removeImages(postId: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await request(`/api/posts/${encodeURIComponent(postId)}/images`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ urls }),
  });
}
