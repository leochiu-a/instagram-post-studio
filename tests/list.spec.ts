import { expect, test } from "@playwright/test";
import { POST, SEED, STORAGE_KEY } from "./fixture";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(([key, seed]) => localStorage.setItem(key, seed), [
    STORAGE_KEY,
    SEED,
  ] as const);
  await page.reload();
});

test("清單列出貼文，點進去才是編輯器", async ({ page }) => {
  await page.getByRole("link", { name: new RegExp(POST.title) }).click();
  await expect(page).toHaveURL(`/post/${POST.id}`);
  await expect(page.getByLabel("貼文名稱")).toHaveValue(POST.title);
  await expect(page.locator(`[data-slide-id="${POST.slides[0].id}"]`)).toBeVisible();

  await page.getByRole("link", { name: "貼文清單" }).click();
  await expect(page).toHaveURL("/");
});

test("新增的貼文會進到清單，改名字清單也跟著變", async ({ page }) => {
  await page.getByRole("button", { name: "新增貼文" }).click();
  await expect(page).toHaveURL(/\/post\/.+/);

  await page.getByLabel("貼文名稱").fill("第二篇");
  await page.getByRole("link", { name: "貼文清單" }).click();

  const titles = page.getByRole("list").getByRole("link");
  await expect(titles).toHaveCount(2);
  await expect(titles.first()).toContainText("第二篇");

  // 重新整理後兩篇都還在，才算真的存進 localStorage
  await page.reload();
  await expect(page.getByRole("list").getByRole("link")).toHaveCount(2);
});

test("刪除貼文之後直接開它的網址會顯示找不到", async ({ page }) => {
  await page.getByRole("button", { name: "刪除" }).click();
  await expect(page.getByText("還沒有貼文")).toBeVisible();

  await page.goto(`/post/${POST.id}`);
  await expect(page.getByText("找不到這篇貼文")).toBeVisible();
});
