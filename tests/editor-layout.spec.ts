import { expect, test } from "@playwright/test";
import { POST, SEED, STORAGE_KEY } from "./fixture";

/** 量左右兩欄的寬度、各自的捲動範圍，以及第一張預覽實際被畫成多寬 */
const measure = () =>
  ({
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    columns: [...document.querySelectorAll("main > *")].map((column) => ({
      width: column.clientWidth,
      scrollable: column.scrollHeight > column.clientHeight + 1,
    })),
    cardWidth: Math.round(document.querySelector("[data-slide-id]")!.getBoundingClientRect().width),
  }) as const;

test.beforeEach(async ({ page }) => {
  await page.goto(`/post/${POST.id}`);
  await page.evaluate(([key, seed]) => localStorage.setItem(key, seed), [
    STORAGE_KEY,
    SEED,
  ] as const);
  await page.reload();
  await expect(page.locator(`[data-slide-id="${POST.slides[0].id}"]`)).toBeVisible();
});

test("桌機版是左右各半、頁面本身不捲動，預覽那一欄自己捲", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  const layout = await page.evaluate(measure);

  expect(layout.pageScrolls, "外殼固定高度，捲動交給各欄自己").toBe(false);
  expect(layout.columns).toHaveLength(2);
  // 右欄多了一條 scrollbar，會比左欄窄一點
  expect(layout.columns[0].width).toBeGreaterThan(1280 * 0.45);
  expect(layout.columns[1].width).toBeGreaterThan(1280 * 0.45);
  expect(layout.columns[1].scrollable, "五張預覽一定超過一個視窗高").toBe(true);
});

test("預覽跟著欄寬縮放", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  const narrow = await page.evaluate(measure);

  await page.setViewportSize({ width: 1600, height: 820 });
  await expect
    .poll(async () => (await page.evaluate(measure)).cardWidth)
    .toBeGreaterThan(narrow.cardWidth);
});
