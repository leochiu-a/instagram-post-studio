# IG Post Studio

把 Canva 上的 Instagram 貼文版型搬進瀏覽器：貼一份 Markdown，就能匯出 1080×1350 的 PNG。

```bash
pnpm dev       # http://localhost:3000
pnpm check     # oxfmt --check + oxlint + tsc --noEmit
pnpm test:e2e  # headless 驗證匯出結果（自己起 dev server）
```

## 貼文存在哪

一篇貼文就是 `content/posts/` 底下的一個 `.md` 檔，圖片是 `public/post-images/<檔名>/`
底下的 WebP。沒有資料庫、不用設定，`pnpm dev` 起來就能用；整個資料夾可以直接進版控。

```
content/posts/vite-plus.md          ← 這一篇的全部內容
public/post-images/vite-plus/*.webp ← 這一篇用到的圖
```

檔名在建立時由標題轉出來（中文保留），之後改標題**不會**改檔名 ——
網址與圖片資料夾都掛在它身上，重新命名等於把每一張圖的路徑弄丟。

檔案長這樣：

```md
---
title: "Vite+ 來了，前端工具鏈的全面進化"
handle: "@leo.web.dev"
timestamp: "3 min ago"
theme: "dark"
created: "2026-08-30T12:00:00.000Z"
cta:
  subhead: "分享給你的朋友吧！"
  headline: "這篇貼文對你有幫助嗎？"
  stats: ["560", "204", "427", "318"]
  image: ""
---

# Vite+ 來了，前端工具鏈的全面進化

![banner](/post-images/vite-plus/2f1c….webp)

## 一個工具，取代全部
```

frontmatter 只放 Markdown 表達不了的東西：帳號、配色，以及結尾 CTA 頁的那幾個欄位。
**頁面本身不存** —— 讀檔時用 [`parseMarkdown`](src/lib/markdown.ts) 現算，所以不會有
「檔案寫著 A、另一份快取寫著 B」這種對不起來的狀況。

讀寫走三個 route handler（[`src/app/api/posts`](src/app/api/posts)），實作在
[`post-files.ts`](src/lib/post-files.ts)：每個函式只收 slug 或檔名、而且都先過格式檢查，
所以 request 帶什麼路徑進來都走不出上面那兩個資料夾。

編輯是**先改畫面、再延後 600ms 合併存檔**（見 [`src/lib/post-store.ts`](src/lib/post-store.ts)）：
每打一個字寫一次檔會讓 dev server 一直重讀，等 round-trip 回來才更新畫面則會卡住輸入。
分頁切到背景時會把還沒送出的編輯用 `keepalive` 補送，所以不會掉最後幾個字。

> 這是本機工具，跑的是 `next dev`。`next build` 只會收進**建置當下**已經存在的
> `public/`，所以 `pnpm start` 之後新上傳的圖不會被服務到。

## 版型來源

兩個 Canva 設計其實是同一套版型的深／淺配色，所有座標與字級都是從原稿量出來後寫進
[`src/lib/theme.ts`](src/lib/theme.ts) 的 `METRICS`：

| 元素            | 規格                                                                            |
| --------------- | ------------------------------------------------------------------------------- |
| 畫布            | 1080×1350（4:5），左右安全邊界 71.12                                            |
| 頁首            | `@handle`（左）+ 時間（右），30.67px，y=143.87 — **只有封面與結尾頁有**         |
| 內頁頁碼 / 標題 | 同一條線上左右對齊，58.67px bold，y=108                                         |
| 內文            | 40px / line-height 1.55 / letter-spacing -0.006em，x=73.04、寬 935.84、y=236.34 |
| 封面大標        | 88px bold / line-height 1.5                                                     |
| SWIPE 膠囊      | 395.92×124.93 @ (754.77, 1261.75)，刻意超出畫布只露一角                         |
| 結尾頁          | 38.67 小標 + 78.67 大標 + `#234b52` 膠囊裡的四個互動 icon                       |

配色定義在同一支檔案的 `PALETTES`：

- **深色**：背景 135° 漸層 `#1d2a3a → #0c1320`、文字 `#ffffff`
- **淺色**：背景 `#f8f7f4`、文字 `#2b2d42`、強調 `#8d99ae`

> Canva 的深色頁把程式碼字設成 `#234b52`，在深底上幾乎看不見；這裡兩個配色都用 `#8d99ae`。

## Markdown 語法

| 寫法                 | 結果                                      |
| -------------------- | ----------------------------------------- |
| `# 標題`             | 封面                                      |
| `## 標題`            | 一張內頁，頁碼自動編號 01、02…            |
| `![版位](網址)`      | 該頁的圖片，版位是 banner / square / none |
| `- 項目`             | 項目符號                                  |
| `**粗體**`（⌘B）     | 套用強調色                                |
| `*斜體*`（⌘I）       | italic，不改顏色                          |
| `` `程式碼` ``（⌘E） | 淺色 chip                                 |

行內標記只有這三種，而且互斥：`***又粗又斜***` 版型畫不出來，所以快捷鍵是「換掉」
而不是「疊上去」。Markdown 面板是 CodeMirror（[markdown-input.tsx](src/components/markdown-input.tsx)），
除了上面那三個快捷鍵，Enter 也會自動延續 `- ` 列點。

圖片版位寫在 alt 裡。alt 本來就空著沒用，拿它裝版位就不必為了一個列舉值多開一個
frontmatter 欄位——版位跟著圖走，手動改 md 的人也看得懂。認不得的 alt（例如
`![螢幕截圖](…)`）當成 banner，不是錯誤。

結尾 CTA 頁會自動補上。兩種編輯模式是同一份資料的兩個投影：停止輸入後 Markdown 會
自動解析成頁面，逐頁的改動也會即時序列化回這份 Markdown——而那份 Markdown 就是磁碟上
那個檔案的正文。

## 匯出

用 [modern-screenshot](https://github.com/qq15725/modern-screenshot) 直接把 DOM 畫成 PNG，
所以版型元件永遠以 1080×1350 的真實尺寸渲染，預覽的縮放交給外層 `transform`。

- 圖片請**上傳本機檔案**，會轉成 WebP 寫進 `public/post-images/`，欄位存的是相對路徑。
  同源所以匯出讀得到；貼上其他站的網址則可能因 CORS 失敗。
- 瀏覽器要有真實使用者點擊才會存檔，程式化觸發的下載會被丟掉。

## 驗證

`pnpm test:e2e` 用 Playwright 在 headless Chromium 裡跑完整流程，不會碰到你平常用的瀏覽器，
也不會彈出系統的存檔對話框（Playwright 自己接下 download 事件）。

測試會直接在 `content/posts/` 建檔案，而那裡通常也躺著你真正在寫的貼文，所以**絕對不清空
整個資料夾**：每個 test 用自己的專屬 tag、收尾只刪檔名或標題帶著那個 tag 的檔案
（見 [`tests/posts.ts`](tests/posts.ts)）——也因此測試不能假設「清單上只有我這一篇」。

驗的東西：

- 四種頁型的圖片都落在量出來的版位上，且不越過 SWIPE 膠囊（結尾頁沒有膠囊，不套這條）
- 程式碼 chip 的底色、文字色、圓角正確，且沒有撐開行高
- 編輯後重新整理，內容還在（真的落到 `.md` 檔裡，不是只活在記憶體）
- 匯出的 ZIP 有五張 1080×1350 的 PNG，並直接對 PNG **取樣像素**確認 chip 與圖片
  真的被畫進去了 —— 光看預覽的 DOM 不足以證明 modern-screenshot 有正確處理

取樣座標是從 DOM 量出來後換算成畫布座標，不是寫死的數字，版型調動時不需要跟著改。

測試跑在 dev server 上，所以剛改完原始碼馬上跑可能會撞到 HMR 還沒重編；重跑一次就好。

## 工具鏈

oxlint + oxfmt（取代 ESLint / Prettier），透過 husky + lint-staged 在 commit 前跑。
