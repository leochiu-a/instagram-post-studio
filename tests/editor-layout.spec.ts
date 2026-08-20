import type { Page } from "@playwright/test";
import { expect, test } from "./db";
import { POST } from "./fixture";

/** 量各欄的寬度、捲動範圍，以及第一張預覽實際被畫成多大 */
const measure = () =>
  ({
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    columns: [...document.querySelectorAll("main > *")].map((column) => column.clientWidth),
    // 面板的捲動容器是裡面那層，不是有邊框的外層
    panelScrolls: (() => {
      const box = document.querySelector("#editor-panel > div");
      return box ? box.scrollHeight > box.clientHeight + 1 : null;
    })(),
    railOverflowsX: (() => {
      const nav = document.querySelector("main > nav");
      return nav ? nav.scrollWidth > nav.clientWidth + 1 : null;
    })(),
    panelOverflowsX: (() => {
      const box = document.querySelector("#editor-panel > div");
      return box ? box.scrollWidth > box.clientWidth + 1 : null;
    })(),
    cardWidth: Math.round(document.querySelector("[data-slide-id]")!.getBoundingClientRect().width),
    cardHeight: Math.round(
      document.querySelector("[data-preview-slide]")!.getBoundingClientRect().height,
    ),
    benchBottom: Math.round(document.querySelector(".bench")!.getBoundingClientRect().bottom),
    stripTop: Math.round(
      document.querySelector('[aria-label="跳到第 1 張"]')?.getBoundingClientRect().top ??
        Number.POSITIVE_INFINITY,
    ),
  }) as const;

/**
 * 改視窗大小之後等兩個 frame：預覽的縮放是 ResizeObserver 算的，
 * 回呼要到下一個 frame 才送到，馬上量會拿到上一個尺寸。
 */
const settle = (page: Page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );

test.beforeEach(async ({ page, app }) => {
  const post = await app.seed();
  await page.goto(`/post/${post.id}`);
  await expect(page.locator(`[data-slide-id="${post.slides[0].id}"]`)).toBeVisible();
});

test("桌機版是 rail + 固定寬面板 + 吃滿剩餘空間的畫布區，頁面本身不捲動", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  const layout = await page.evaluate(measure);

  expect(layout.pageScrolls, "外殼固定高度，捲動交給各欄自己").toBe(false);
  expect(layout.columns, "rail、面板、畫布欄").toHaveLength(3);
  expect(layout.columns[0], "rail 是 84px").toBe(84);
  expect(layout.columns[1], "面板是 340px").toBe(340);
  expect(layout.columns[2], "剩下的全歸畫布區").toBeGreaterThan(1280 - 84 - 340 - 20);

  // rail 是寫死寬度的，標籤長度不能把它撐破（Markdown 這個字就差點做到）
  expect(layout.railOverflowsX, "rail 的標籤不能溢出").toBe(false);
});

test("收合面板之後畫布吃滿剩下的寬度", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await settle(page);
  const before = await page.evaluate(measure);

  await page.getByRole("button", { name: "收合面板" }).click();
  await settle(page);
  const after = await page.evaluate(measure);

  expect(after.columns, "面板整個拿掉，只剩 rail 與畫布欄").toHaveLength(2);
  expect(after.columns[1]).toBeGreaterThan(before.columns[2] + 300);

  // 再點一次 rail 上的項目就回來
  await page.getByRole("button", { name: "Markdown" }).click();
  expect((await page.evaluate(measure)).columns).toHaveLength(3);
});

test("縮圖抽屜展開時畫布讓出高度，不是蓋在上面", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await settle(page);
  const before = await page.evaluate(measure);

  await page.getByRole("button", { name: "頁面 05" }).click();
  await expect(page.getByRole("button", { name: "跳到第 3 張" })).toBeVisible();
  await settle(page);
  const after = await page.evaluate(measure);

  expect(after.cardHeight, "抽屜佔掉高度，預覽跟著縮小").toBeLessThan(before.cardHeight);
  expect(after.benchBottom, "抽屜是讓出來的，不是蓋上去的").toBeLessThanOrEqual(after.stripTop);

  // 縮圖是同一個 SlideCard 再畫一次。匯出靠 data-slide-id 找節點、而
  // querySelector 只會拿第一個 —— 縮圖沒標 decorative 的話就會匯出到那張 52px 的。
  expect(await page.locator("[data-slide-id]").count(), "一張只能有一個匯出節點").toBe(
    POST.slides.length,
  );
});

test("預覽同時吃畫布區的寬與高", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await settle(page);
  const short = await page.evaluate(measure);

  // 高度才是瓶頸的時候，拉寬不該讓畫布長出視窗外
  await page.setViewportSize({ width: 1600, height: 820 });
  await settle(page);
  expect((await page.evaluate(measure)).cardWidth).toBe(short.cardWidth);

  // 拉高視窗，畫布才跟著長大
  await page.setViewportSize({ width: 1600, height: 1200 });
  await settle(page);
  expect((await page.evaluate(measure)).cardWidth).toBeGreaterThan(short.cardWidth);
});

test("切到逐頁也不會把整頁撐長", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.getByRole("button", { name: "逐頁" }).click();
  await expect(page.getByLabel("封面大標")).toBeVisible();

  const layout = await page.evaluate(measure);

  // ImagePicker 裡那個 sr-only 的 file input 是 position: absolute，
  // 少了定位祖先就會逃出左欄的捲動容器、把 document 撐到兩倍高
  expect(layout.pageScrolls, "逐頁的欄位再多，也是面板自己捲").toBe(false);
  expect(layout.panelScrolls, "五頁的欄位一定超過一個視窗高").toBe(true);

  /*
    Item 底層是 flex-wrap，而我們把它改成 flex-col —— column 方向的「換行」
    是往右邊「換一欄」。面板是 flex-1 + min-h-0 的高度受限容器，卡片一被壓扁
    就會把欄位整排推到面板外面，而且是靜靜地被裁掉，不會有任何錯誤。
  */
  expect(layout.panelOverflowsX, "逐頁的欄位不能溢出面板寬度").toBe(false);
});

test("內文欄位長出內容的高度，不出現自己的捲軸", async ({ page }) => {
  await page.getByRole("button", { name: "逐頁" }).click();

  const body = page.getByLabel("內文").first();
  await body.fill(Array.from({ length: 20 }, (_, i) => `第 ${i + 1} 行`).join("\n"));

  const fits = await body.evaluate(
    (node: HTMLTextAreaElement) => node.scrollHeight <= node.clientHeight + 1,
  );
  expect(fits, "field-sizing: content 應該讓它跟著內容長高").toBe(true);
});

test("頂列讀數跟著選取改變，快捷列選中才出現", async ({ page }) => {
  const readout = page.getByText(/1080×1350/);
  // 快捷列是靠 opacity 收起來的（要保留 transition），所以量 CSS 不是量 visible
  const quickBar = page.locator('[data-slot="slide-quickbar"]').first();

  // 沒選東西的時候只報整份貼文的規格，快捷列收著
  await expect(readout).toHaveText("1080×1350 · 05P");
  await expect(quickBar).toHaveCSS("opacity", "0");

  await page.getByRole("button", { name: "選取第 1 張" }).click();

  // 選了才展開那一張的頁次與類型，快捷列跟著浮出來
  await expect(readout).toHaveText("01 / 05 · 封面 · 1080×1350");
  await expect(quickBar).toHaveCSS("opacity", "1");
});
