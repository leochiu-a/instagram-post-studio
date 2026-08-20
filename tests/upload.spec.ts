import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { expect, test } from "./db";
import { SLIDES } from "./fixture";
import { hexToRgb, isClose, pngSize, samplePixels, solidPng } from "./helpers";
import { CANVAS, METRICS } from "../src/lib/theme";

/** 跟版型裡任何顏色都不撞的顏色，取樣才不會誤判 */
const UPLOAD_COLOR = "#ff00ff";

/**
 * 這條鏈是整個 Supabase 改動裡最容易壞的一段：
 * 上傳到 Storage → 拿公開網址 → html-to-image 把它 fetch 回來畫進 canvas。
 * 中間任何一步的 CORS 或 mime type 設錯，畫面上看起來都還是好的，
 * 只有真的匯出並取樣像素才驗得出來。
 */
test("上傳的圖進 Storage，公開網址匯得出來", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto(`/post/${post.id}`);
  await expect(page.locator(`[data-slide-id="${SLIDES[0].id}"]`)).toBeVisible();

  // 逐頁面板才有圖片欄位
  await page.getByRole("button", { name: "逐頁" }).click();
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: "upload.png",
    mimeType: "image/png",
    buffer: solidPng(UPLOAD_COLOR),
  });

  // 欄位存的必須是 Storage 的公開網址，不是 data URL
  await expect
    .poll(() => app.read(post.id).then((row) => row?.slides[0]?.imageUrl))
    .toContain("/storage/v1/object/public/post-images/");

  // 上傳的是 PNG，Storage 裡應該是轉檔後的 WebP
  const imageUrl = await app.read(post.id).then((row) => row?.slides[0]?.imageUrl ?? "");
  expect(imageUrl.endsWith(".webp"), `副檔名要是 .webp，實際是 ${imageUrl}`).toBe(true);

  const head = await page.request.fetch(imageUrl, { method: "HEAD" });
  expect(head.headers()["content-type"]).toBe("image/webp");

  // 外部網址的 CORS 警告不該出現 —— 自己 bucket 的圖是安全的
  await expect(page.getByText("外部網址的圖片可能因為 CORS")).toBeHidden();

  // 逐頁的下載按鈕要 hover 才浮出來，走工具列的 ZIP 穩定得多
  const download = await Promise.race([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "匯出全部（ZIP）" })
      .click()
      .then(() => page.waitForEvent("download")),
  ]);
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  const cover = await zip.files["01.png"].async("nodebuffer");

  expect(pngSize(cover)).toEqual({ width: CANVAS.width, height: CANVAS.height });

  // 封面橫幅版位的中心：html-to-image 沒把 Storage 的圖抓回來的話，這裡會是背景色
  const banner = METRICS.image.banner;
  const [pixel] = await samplePixels(page, cover, [
    [banner.left + banner.width / 2, banner.top + banner.height / 2],
  ]);
  expect(
    isClose(pixel, hexToRgb(UPLOAD_COLOR)),
    `版位中心應該是上傳的顏色，實際拿到 ${pixel.join(",")}`,
  ).toBe(true);
});

test("換圖會把舊的檔案從 bucket 刪掉", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto(`/post/${post.id}`);
  await expect(page.locator(`[data-slide-id="${SLIDES[0].id}"]`)).toBeVisible();
  await page.getByRole("button", { name: "逐頁" }).click();

  const cover = page.locator('input[type="file"]').first();
  const coverUrl = () => app.read(post.id).then((row) => row?.slides[0]?.imageUrl ?? "");

  /** 上傳並等到寫回資料庫 —— 寫入是 debounce 的，不能一上傳完就讀 */
  const upload = async (hex: string) => {
    const before = await coverUrl();
    await cover.setInputFiles({
      name: "pic.png",
      mimeType: "image/png",
      buffer: solidPng(hex),
    });
    await expect.poll(coverUrl).not.toBe(before);
    return coverUrl();
  };

  const first = await upload("#ff00ff");
  const firstName = first.split("/").pop() ?? "";
  expect(await app.images(post.id)).toEqual([firstName]);

  // 換第二張：bucket 裡應該只剩新的那個，舊的不能留下來當孤兒
  await upload("#00ff88");
  await expect.poll(() => app.images(post.id)).toHaveLength(1);
  expect(await app.images(post.id)).not.toContain(firstName);

  // 按叉叉移除圖片，bucket 要清空
  await page.getByRole("button", { name: "移除圖片" }).first().click();
  await expect.poll(() => app.images(post.id)).toEqual([]);
});
