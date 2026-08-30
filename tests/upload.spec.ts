import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { expect, test } from "./posts";
import { SLIDES } from "./fixture";
import { hexToRgb, isClose, pngSize, samplePixels, solidPng } from "./helpers";
import { CANVAS, METRICS } from "../src/lib/theme";

/** 跟版型裡任何顏色都不撞的顏色，取樣才不會誤判 */
const UPLOAD_COLOR = "#ff00ff";

/**
 * 這條鏈最容易壞：寫進 public/post-images → 貼文存相對路徑 →
 * modern-screenshot 把它 fetch 回來畫進 canvas。中間任何一步的路徑或
 * mime type 錯了，畫面上看起來都還是好的，只有真的匯出並取樣像素才驗得出來。
 */
test("上傳的圖落到 public/post-images，相對路徑匯得出來", async ({ page, app }) => {
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

  // 欄位存的必須是 public/post-images 底下的相對路徑，不是 data URL
  await expect
    .poll(() => app.read(post.id).then((saved) => saved?.slides[0]?.imageUrl))
    .toContain(`/post-images/${post.id}/`);

  // 上傳的是 PNG，落到磁碟上應該是轉檔後的 WebP
  const imageUrl = await app.read(post.id).then((saved) => saved?.slides[0]?.imageUrl ?? "");
  expect(imageUrl.endsWith(".webp"), `副檔名要是 .webp，實際是 ${imageUrl}`).toBe(true);

  const head = await page.request.fetch(imageUrl, { method: "HEAD" });
  expect(head.headers()["content-type"]).toBe("image/webp");

  // 外部網址的 CORS 警告不該出現 —— 自己寫進 public/ 的圖是同源的
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

  // 封面橫幅版位的中心：匯出時沒把圖抓回來的話，這裡會是背景色
  const banner = METRICS.image.banner;
  const [pixel] = await samplePixels(page, cover, [
    [banner.left + banner.width / 2, banner.top + banner.height / 2],
  ]);
  expect(
    isClose(pixel, hexToRgb(UPLOAD_COLOR)),
    `版位中心應該是上傳的顏色，實際拿到 ${pixel.join(",")}`,
  ).toBe(true);
});

test("換圖會把舊的檔案從磁碟刪掉", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto(`/post/${post.id}`);
  await expect(page.locator(`[data-slide-id="${SLIDES[0].id}"]`)).toBeVisible();
  await page.getByRole("button", { name: "逐頁" }).click();

  const cover = page.locator('input[type="file"]').first();
  const coverUrl = () => app.read(post.id).then((saved) => saved?.slides[0]?.imageUrl ?? "");

  /** 上傳並等到存檔 —— 寫入是 debounce 的，不能一上傳完就讀 */
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

  // 換第二張：資料夾裡應該只剩新的那個，舊的不能留下來當孤兒
  await upload("#00ff88");
  await expect.poll(() => app.images(post.id)).toHaveLength(1);
  expect(await app.images(post.id)).not.toContain(firstName);

  // 按叉叉移除圖片，資料夾要清空
  await page.getByRole("button", { name: "移除圖片" }).first().click();
  await expect.poll(() => app.images(post.id)).toEqual([]);
});
