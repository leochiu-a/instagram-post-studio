import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { CONTENT_IMAGE, COVER_IMAGE, CTA_IMAGE, POST, SEED, SLIDES, STORAGE_KEY } from "./fixture";
import { canvasRect, hexToRgb, isClose, pngSize, samplePixels } from "./helpers";
import { CANVAS, METRICS, PALETTES } from "../src/lib/theme";

/** SWIPE 膠囊的上緣：任何內容都不該越過這條線 */
const SWIPE_TOP = METRICS.swipe.top;

test.beforeEach(async ({ page }) => {
  // 刻意不用 addInitScript：它在每次載入（包含 reload）都會跑，會把剛剛的編輯蓋掉
  await page.goto(`/post/${POST.id}`);
  await page.evaluate(([key, seed]) => localStorage.setItem(key, seed), [
    STORAGE_KEY,
    SEED,
  ] as const);
  await page.reload();
  await expect(page.locator(`[data-slide-id="${SLIDES[0].id}"]`)).toBeVisible();
});

test("每張頁面的圖片都落在版位上，且不會越過 SWIPE 膠囊", async ({ page }) => {
  const expected = [
    { id: "t1", width: METRICS.image.banner.width, height: METRICS.image.banner.height },
    { id: "t2", width: METRICS.contentWidth, height: METRICS.image.banner.height },
    { id: "t3", width: METRICS.image.square.size, height: METRICS.image.square.size },
    { id: "t4", width: METRICS.contentWidth, height: METRICS.image.banner.height },
    { id: "t5", width: METRICS.cta.image.width, height: METRICS.cta.image.height },
  ];

  for (const slot of expected) {
    const rect = await canvasRect(page, slot.id, "img");
    expect(rect, `頁面 ${slot.id} 應該要有圖片`).not.toBeNull();
    expect(rect!.width).toBeCloseTo(slot.width, 0);
    expect(rect!.height).toBeCloseTo(slot.height, 0);
    // 結尾頁沒有 SWIPE 膠囊，這條限制只套在封面與內頁
    if (slot.id !== "t5") {
      expect(rect!.top + rect!.height).toBeLessThanOrEqual(SWIPE_TOP);
    }
  }
});

test("內文的程式碼渲染成原稿的淺色 chip，且不撐開行高", async ({ page }) => {
  const chip = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('[data-slide-id="t2"]');
    const span = card?.querySelector<HTMLElement>('span[style*="border-radius"]');
    if (!card || !span) return null;
    const line = span.parentElement as HTMLElement;
    const scale = card.getBoundingClientRect().width / 1080;
    const style = getComputedStyle(span);
    // 字真正的墨水範圍，用來確認 chip 沒有切到「p」的下緣
    const context = document.createElement("canvas").getContext("2d")!;
    // 預覽是 transform 縮放的，getComputedStyle 拿到的仍是畫布座標的字級
    context.font = `${style.fontSize} ${style.fontFamily}`;
    const ink = context.measureText(span.textContent!);
    const box = span.getBoundingClientRect();
    const content = document.createRange();
    content.selectNodeContents(span);
    const baseline =
      (content.getBoundingClientRect().top - box.top) / scale + ink.fontBoundingBoxAscent;

    return {
      background: style.backgroundColor,
      color: style.color,
      radius: style.borderRadius,
      display: style.display,
      height: box.height / scale,
      inkTopMargin: baseline - ink.actualBoundingBoxAscent,
      inkBottomMargin: box.height / scale - (baseline + ink.actualBoundingBoxDescent),
      lineHeight: line.getBoundingClientRect().height / scale,
    };
  });

  expect(chip).not.toBeNull();
  expect(chip!.background).toBe("rgb(216, 226, 230)");
  expect(chip!.color).toBe("rgb(35, 75, 82)");
  expect(chip!.radius).toBe("12px");
  // 行框不能被 chip 撐高，行位才對得上原稿
  expect(chip!.display).toBe("inline-block");
  expect(chip!.lineHeight).toBeCloseTo(METRICS.body.fontSize * METRICS.body.lineHeight, 0);
  // chip 比行距矮，連續幾行的 chip 上下才不會黏成一整片
  expect(chip!.height).toBeLessThan(chip!.lineHeight - 5);
  // 墨水上下都要被底色蓋住，「p」的下緣才不會看起來被切掉
  expect(chip!.inkTopMargin).toBeGreaterThan(2);
  expect(chip!.inkBottomMargin).toBeGreaterThan(2);
});

test("重新整理後內容還在", async ({ page }) => {
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByLabel("帳號").fill("@changed.handle");
  await expect(page.locator('[data-slide-id="t1"]')).toContainText("@changed.handle");

  // 等寫入真的落地再重新整理 —— DOM 更新到 effect 寫入 storage 之間有一小段空窗
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const state = JSON.parse(raw) as { posts: Record<string, { handle: string }> };
        return state.posts.t.handle;
      }, STORAGE_KEY),
    )
    .toBe("@changed.handle");

  await page.reload();
  await expect(page.locator('[data-slide-id="t1"]')).toContainText("@changed.handle");
});

test("匯出的 ZIP 每張都是 1080×1350，且 chip 與圖片真的畫進 PNG", async ({ page }) => {
  const chipRect = await canvasRect(page, "t2", 'span[style*="border-radius"]');
  expect(chipRect).not.toBeNull();

  const download = await Promise.race([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "匯出全部（ZIP）" })
      .click()
      .then(() => page.waitForEvent("download")),
  ]);
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  const names = Object.keys(zip.files).toSorted();
  expect(names).toEqual(["01.png", "02.png", "03.png", "04.png", "05.png"]);

  const pages = await Promise.all(names.map((name) => zip.files[name].async("nodebuffer")));

  for (const [index, png] of pages.entries()) {
    expect(pngSize(png), `第 ${index + 1} 張的尺寸`).toEqual({
      width: CANVAS.width,
      height: CANVAS.height,
    });
  }

  const banner = METRICS.image.banner;
  const bannerCentre: [number, number] = [
    banner.left + banner.width / 2,
    banner.top + banner.height / 2,
  ];

  const [coverPixel] = await samplePixels(page, pages[0], [bannerCentre]);
  expect(isClose(coverPixel, hexToRgb(COVER_IMAGE)), "封面的圖片要出現在匯出的 PNG 裡").toBe(true);

  // chip 的上緣中央：在 chip 內部但在文字上方，不會取到字的筆畫
  const chipPoint: [number, number] = [
    Math.round(chipRect!.left + chipRect!.width / 2),
    Math.round(chipRect!.top + 3),
  ];
  const [chipPixel] = await samplePixels(page, pages[1], [chipPoint]);
  expect(
    isClose(chipPixel, hexToRgb(PALETTES.dark.code.fill)),
    "code chip 要出現在匯出的 PNG 裡",
  ).toBe(true);

  const contentRect = await canvasRect(page, "t4", "img");
  const [longBodyPixel] = await samplePixels(page, pages[3], [
    [
      Math.round(contentRect!.left + contentRect!.width / 2),
      Math.round(contentRect!.top + contentRect!.height / 2),
    ],
  ]);
  expect(
    isClose(longBodyPixel, hexToRgb(CONTENT_IMAGE)),
    "內文很長時圖片仍要出現在匯出的 PNG 裡",
  ).toBe(true);

  const ctaImage = METRICS.cta.image;
  const [ctaPixel] = await samplePixels(page, pages[4], [
    [ctaImage.left + ctaImage.width / 2, ctaImage.top + ctaImage.height / 2],
  ]);
  expect(isClose(ctaPixel, hexToRgb(CTA_IMAGE)), "結尾頁的圖片要出現在匯出的 PNG 裡").toBe(true);
});
