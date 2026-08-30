import { expect, test } from "./posts";
import { SLIDES } from "./fixture";

/**
 * Markdown 面板是 CodeMirror，內容是 contenteditable —— 不能用 fill()，
 * 要真的點進去打字，才會走到跟使用者一樣的那條路。
 */
const editor = (page: import("@playwright/test").Page) => page.locator(".cm-content");

test.beforeEach(async ({ page, app }) => {
  const post = await app.seed();
  await page.goto(`/post/${post.id}`);
  await expect(page.locator(`[data-slide-id="${SLIDES[0].id}"]`)).toBeVisible();
});

test("⌘B / ⌘I / ⌘E 包標記，而且三種標記互斥", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("\n\n## 快捷鍵\n\n斜體測試");

  // 選取剛打完的那一行
  await page.keyboard.press("Shift+Home");

  await page.keyboard.press("ControlOrMeta+b");
  await expect(editor(page)).toContainText("**斜體測試**");

  // 版型的行內標記互斥，所以第二個快捷鍵是「換掉」而不是疊成 ***字***
  await page.keyboard.press("ControlOrMeta+i");
  await expect(editor(page)).toContainText("*斜體測試*");
  await expect(editor(page)).not.toContainText("**斜體測試");

  await page.keyboard.press("ControlOrMeta+e");
  await expect(editor(page)).toContainText("`斜體測試`");

  // 再按一次同一個就解除
  await page.keyboard.press("ControlOrMeta+e");
  await expect(editor(page)).not.toContainText("`斜體測試`");
});

test("Enter 會自動延續列點", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("\n\n## 列點\n\n- 第一點");
  await page.keyboard.press("Enter");
  await page.keyboard.type("第二點");

  await expect(editor(page)).toContainText("- 第二點");
});

/**
 * 斜體要真的走到版型上 —— 只驗編輯器裡的字串等於沒驗，
 * 使用者要的是匯出的圖上那段字是斜的。
 */
test("*斜體* 在頁面上是 italic，而且不搶粗體的強調色", async ({ page }) => {
  const style = await page.evaluate((id) => {
    const card = document.querySelector<HTMLElement>(`[data-slide-id="${id}"]`);
    const spans = [...(card?.querySelectorAll("span") ?? [])];
    const pick = (text: string) => spans.find((span) => span.textContent === text);
    const italic = pick("斜體");
    const strong = pick("粗體");
    if (!italic || !strong) return null;
    return {
      style: getComputedStyle(italic).fontStyle,
      weight: getComputedStyle(italic).fontWeight,
      color: getComputedStyle(italic).color,
      strongColor: getComputedStyle(strong).color,
      strongWeight: getComputedStyle(strong).fontWeight,
    };
  }, SLIDES[1].id);

  expect(style, "內頁應該要有一段斜體與一段粗體").not.toBeNull();
  expect(style!.style).toBe("italic");
  // 斜體只改字形：加粗或套強調色都會跟粗體的訊號打架
  expect(style!.weight).not.toBe(style!.strongWeight);
  expect(style!.color).not.toBe(style!.strongColor);
});
