import { expect, test } from "./posts";
import { SLIDES } from "./fixture";
import type { Slide } from "../src/lib/types";

/**
 * 拖曳排序。dnd-kit 靠真實的 pointer 事件序列驅動，所以 steps 不能省 ——
 * 一步跳到終點的話 sensor 收不到中間的移動，判定不出是拖曳。
 */
async function dragThumb(page: import("@playwright/test").Page, from: number, to: number) {
  // 用 getByLabel 而不是 getByRole：dnd-kit 會在外層 li 也放 role="button"，
  // 名稱從內層繼承過去，用 role 找會同時命中兩個
  const source = page.getByLabel(`第 ${from} 張縮圖`);
  const target = page.getByLabel(`第 ${to} 張縮圖`);
  const a = (await source.boundingBox())!;
  const b = (await target.boundingBox())!;

  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

/**
 * 頁面的 id 是解析 Markdown 時依順序給的（p1、p2……），所以搬動之後
 * 「第三張的 id」永遠是 p3 —— 驗 id 等於什麼都沒驗。要驗的是內容的排列。
 */
const label = (slide: Slide) =>
  slide.kind === "cover" ? slide.title : slide.kind === "content" ? slide.heading : "CTA";

test("拖曳縮圖可以改頁面順序，而且寫回檔案", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto(`/post/${post.id}`);
  await expect(page.locator(`[data-slide-id="${SLIDES[0].id}"]`)).toBeVisible();

  const order = () => app.read(post.id).then((saved) => (saved?.slides ?? []).map(label));
  const before = post.slides.map(label);
  expect(await order()).toEqual(before);

  // 第一張拖到第三張的位置
  await dragThumb(page, 1, 3);

  const expected = [before[1], before[2], before[0], before[3], before[4]];
  await expect.poll(order).toEqual(expected);

  // 重新整理後順序還在，才算真的存進去而不是只有畫面動了
  await page.reload();
  await expect(page.locator("[data-slide-id]").first()).toBeVisible();
  expect(await order()).toEqual(expected);
});

test("內頁的頁碼在排序後重新編號，跟著新順序走", async ({ page, app }) => {
  const post = await app.seed();
  await page.goto(`/post/${post.id}`);
  await expect(page.locator(`[data-slide-id="${SLIDES[0].id}"]`)).toBeVisible();

  /*
    只驗「badge 是 01 02 03」是假的斷言 —— 三個內頁不管怎麼排都會是那三個號碼。
    要驗的是配對關係：哪個標題拿到哪個號碼。
  */
  const numbering = () =>
    app
      .read(post.id)
      .then((saved) =>
        (saved?.slides ?? [])
          .filter((slide) => slide.kind === "content")
          .map((slide) => (slide.kind === "content" ? `${slide.badge} ${slide.heading}` : "")),
      );

  expect(await numbering()).toEqual(["01 橫幅版位", "02 比例不同的圖", "03 超長內文"]);

  // 第二張（橫幅版位）拖到第四張的位置 → 它變成最後一個內頁
  await dragThumb(page, 2, 4);

  await expect.poll(numbering).toEqual(["01 比例不同的圖", "02 超長內文", "03 橫幅版位"]);
});
