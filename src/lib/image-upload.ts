import { IMAGE_BUCKET, supabase } from "./supabase";

/** 從 MIME type 取副檔名。File.name 不可靠（有些來源只有 blob），type 才是準的。 */
function extensionOf(file: File) {
  const subtype = file.type.split("/")[1] ?? "png";
  return subtype === "svg+xml" ? "svg" : subtype;
}

/**
 * 把圖上傳到 post-images，回傳公開網址。
 * 用貼文 id 當資料夾，之後刪貼文要一併清圖時可以整個 prefix 掃掉。
 */
export async function uploadImage(file: File, postId: string): Promise<string> {
  const path = `${postId}/${crypto.randomUUID()}.${extensionOf(file)}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) throw error;

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
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
