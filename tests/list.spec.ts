import { expect, test } from "./posts";

test("清單列出貼文，點進去才是編輯器", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto("/");

  await page.getByRole("link", { name: new RegExp(post.title) }).click();
  await expect(page).toHaveURL(`/post/${post.id}`);
  await expect(page.getByLabel("貼文名稱")).toHaveValue(post.title);
  await expect(page.locator(`[data-slide-id="${post.slides[0].id}"]`)).toBeVisible();

  await page.getByRole("link", { name: "貼文清單" }).click();
  await expect(page).toHaveURL("/");
});

test("新增的貼文會進到清單，改名字清單也跟著變", async ({ page, app }) => {
  const title = `第二篇 ${app.tag}`;
  await page.goto("/");
  await expect(page.getByRole("button", { name: "新增貼文" })).toBeEnabled();

  await page.getByRole("button", { name: "新增貼文" }).click();
  await expect(page).toHaveURL(/\/post\/.+/);
  // 檔名可以是中文，在網址上是 percent-encoded 的，解回來才對得上磁碟上的檔案
  const id = decodeURIComponent(new URL(page.url()).pathname.split("/").pop() ?? "");

  await page.getByLabel("貼文名稱").fill(title);
  await page.getByRole("link", { name: "貼文清單" }).click();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

  // 重新整理後還在，才算真的寫進 content/posts 而不是只活在記憶體裡
  await expect.poll(() => app.read(id).then((saved) => saved?.title)).toBe(title);
  await page.reload();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
});

test("刪除要先確認，取消就不會動到檔案", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto("/");

  await page.getByRole("button", { name: `刪除「${post.title}」` }).click();
  await expect(page.getByRole("alertdialog")).toContainText(post.title);

  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("link", { name: new RegExp(post.title) })).toBeVisible();
  expect(await app.read(post.id)).not.toBeNull();
});

test("確認之後貼文會被刪掉，直接開它的網址會顯示找不到", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto("/");
  await expect(page.getByRole("link", { name: new RegExp(post.title) })).toBeVisible();

  await page.getByRole("button", { name: `刪除「${post.title}」` }).click();
  await page.getByRole("button", { name: "刪除", exact: true }).click();
  await expect(page.getByRole("link", { name: new RegExp(post.title) })).toBeHidden();
  await expect.poll(() => app.read(post.id)).toBeNull();

  await page.goto(`/post/${post.id}`);
  await expect(page.getByText("找不到這篇貼文")).toBeVisible();
});
