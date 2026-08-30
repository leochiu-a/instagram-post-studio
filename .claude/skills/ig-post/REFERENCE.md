# IG 貼文版型參考

`src/lib/theme.ts` 的 `METRICS` 是所有座標的單一來源（畫布 1080×1350）。
下面只解釋這些數字怎麼變成行數預算，以及超出 Markdown 能表達的欄位。

## 行數預算的推導

`ContentArea`（`src/components/slide-card.tsx`）：

- 外框 `top: METRICS.body.top` = 236.34、`bottom: 150`（留給 SWIPE 膠囊）
  → 可用高度 `1350 - 236.34 - 150 = 963.66`
- 內文層再往上收 `imageHeight + METRICS.bodyImageGap(48)`：
  banner 278.61 → 637.05；square 390.5 → 525.16
- 一行 `METRICS.body.fontSize(40) × lineHeight(1.55) = 62`
- 寬度 `METRICS.contentWidth` = 935.84；40px 中文字含 `letterSpacing -0.006em` 寬 39.76
  → 23 字換行。`- ` 行被 `paddingLeft: 0.9em` + 項目符號 + `gap: 0.5em` 吃掉約 96px → 21 字。

外框與內文層都是 `overflow: hidden`，圖片錨在外框底部保有完整版位 ——
內文再長也只壓到自己，不會把圖片擠掉。

## 其他版位的溢出邊界

這幾處沒有 `overflow: hidden`，超出不是被裁而是壓到別的元素：

- **封面大標**：88px / 行高 132、`letterSpacing -0.011em` → 每行 10 字，`top: 818`。
  3 行是安全上限（下緣 1214）；第 4 行下緣 1346，壓到 SWIPE 膠囊（`top: 1261.75`）
  又幾乎貼齊畫布底。大標往下長也會把封面圖往上推 —— 圖片的底邊是錨在它上面的。
- **內頁小標**：58.67px / 行高 82.14，跟頁碼同一條線（`top: 108`）、右對齊。
  第 2 行的下緣 272 > 內文區頂 236.34，會疊上內文；左邊也會撞到頁碼，所以 12 字以內。

## 圖片版位

| 形狀        | 座標                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| 封面 banner | `left 73.04 / 寬 935.84`，高度隨圖片比例（上限 510），底邊錨在大標上方 48  |
| 封面 square | `top 301.46 / left 344.75 / 390.5²`                                        |
| 內頁 banner | 內容區滿寬 935.84 × 278.61，錨在內容區底部                                 |
| 內頁 square | 390.5²，錨在內容區底部                                                     |
| CTA         | `top 1070 / left 71.12 / 935.84×200`（原稿沒有這個欄位，擺在互動膠囊下方） |

版位寫在圖片的 alt 裡：`![banner](網址)`、`![square](網址)`、`![none](網址)`，
認不得的 alt 當成 banner。

封面的 banner 不裁圖（`object-fit: contain` + 高度自適應），所以橫的直的都放得下，
但直式圖會把高度吃到上限 510、把大標往下擠得很緊 —— 封面還是給橫幅比例的圖最穩。

圖片請上傳本機檔案，會轉成 WebP 寫進 `public/post-images/<檔名>/` 並存相對路徑；
貼外站網址匯出時可能撞 CORS。

## CTA 頁

`makeCtaSlide` 的預設值。Markdown 正文表達不了，所以存在檔案的 frontmatter
（`cta:` 那一段），要改就在逐頁模式改：

- `subhead`「分享給你的朋友吧！」/ `headline`「這篇貼文對你有幫助嗎？」
- `stats` 四個互動數字 `["560", "204", "427", "318"]`
- `imageUrl` 空字串

## 配色

`PALETTES` 只有 `dark`（135° 漸層 `#1d2a3a → #0c1320`、文字白）與 `light`
（背景 `#f8f7f4`、文字 `#2b2d42`）兩套，在側欄「設定」切換。
兩套共用 accent `#8d99ae` 與程式碼 chip（底 `#d8e2e6`、字 `#234b52`）。

## 檔案就是真相

一篇貼文是 `content/posts/<檔名>.md`：frontmatter 放 Markdown 表達不了的東西
（`title` / `handle` / `timestamp` / `theme` / `created` / `cta`），正文就是這份
Markdown。頁面不存檔，每次讀檔用 `parseMarkdown` 現算。

## 兩種編輯模式

沒有套用按鈕，兩邊互為對方的投影：Markdown 停止輸入後自動解析成頁面，逐頁的
改動也會即時 `toMarkdown` 寫回正文。所以逐頁改的東西不會掉 —— `imageShape`
倒得回圖片的 alt，CTA 欄位倒得回 frontmatter。

## 預覽欄

捲動容器是 `.bench`。點下方縮圖會選取那一頁並把預覽捲過去。
