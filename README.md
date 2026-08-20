# IG Post Studio

把 Canva 上的 Instagram 貼文版型搬進瀏覽器：貼一份 Markdown，就能匯出 1080×1350 的 PNG。

```bash
pnpm dev       # http://localhost:3000
pnpm check     # oxfmt --check + oxlint + tsc --noEmit
pnpm test:e2e  # headless 驗證匯出結果（自己起 dev server）
```

## 設定 Supabase

貼文存在 Supabase Postgres、圖片存在 Supabase Storage，所以跑之前要先接上一個專案。

### 本機（開發與跑測試用這個）

```bash
brew install supabase/tap/supabase
supabase start      # 需要 Docker，第一次會拉 image
supabase status     # 再看一次 API URL 與 anon key
```

`supabase start` 會自動套用 [`supabase/migrations/`](supabase/migrations/) 底下的 migration。
把印出來的 `API_URL` 與 `ANON_KEY` 填進 `.env.local`（`cp .env.example .env.local`）。
改了 migration 之後用 `supabase db reset` 重跑一次。

### 雲端

1. 在 [supabase.com](https://supabase.com) 開一個專案。
2. 把 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) 整份貼到
   Dashboard 的 SQL Editor 執行 —— 它會建 `posts` 表、`post-images` bucket、RLS policy
   與 `anon` 的表權限（policy 對了但少了 grant 會是 `permission denied for table posts`）。
3. `cp .env.example .env.local`，填入 Project Settings → API 的 URL 與 anon key。

> ⚠️ **目前還沒有 Auth**，policy 是「拿到 anon key 的人都能讀寫所有貼文」。
> 也就是說這份設定只適合自己用或內部使用；要開給多人前必須先接上 Supabase Auth，
> 把 policy 換成 `owner = auth.uid()` 的版本。

編輯是**先改畫面、再延後 600ms 合併寫回**（見 [`src/lib/post-store.ts`](src/lib/post-store.ts)）：
每打一個字送一次 request 會打爆 API，等 round-trip 回來才更新畫面則會卡住輸入。
分頁切到背景時會把還沒送出的編輯補送，所以不會掉最後幾個字。

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

| 寫法                       | 結果                           |
| -------------------------- | ------------------------------ |
| `# 標題`                   | 封面                           |
| `## 標題`                  | 一張內頁，頁碼自動編號 01、02… |
| `![](網址)`                | 該頁的圖片                     |
| `- 項目`                   | 項目符號                       |
| `**粗體**`、`` `程式碼` `` | 套用強調色                     |

結尾 CTA 頁會自動補上。兩種編輯模式共用同一份頁面資料：Markdown 分頁按「套用到頁面」會
**重建**所有頁面，逐頁模式則直接改單頁；「用目前頁面覆蓋草稿」可以把頁面倒回 Markdown。

## 匯出

用 [modern-screenshot](https://github.com/qq15725/modern-screenshot) 直接把 DOM 畫成 PNG，
所以版型元件永遠以 1080×1350 的真實尺寸渲染，預覽的縮放交給外層 `transform`。

- 圖片請**上傳本機檔案**，會進 `post-images` bucket，欄位存的是公開網址。
  這個 bucket 是公開讀取的，有 CORS 標頭，匯出讀得到；貼上其他站的網址則可能因 CORS 失敗。
- 瀏覽器要有真實使用者點擊才會存檔，程式化觸發的下載會被丟掉。

## 驗證

`pnpm test:e2e` 用 Playwright 在 headless Chromium 裡跑完整流程，不會碰到你平常用的瀏覽器，
也不會彈出系統的存檔對話框（Playwright 自己接下 download 事件）。

測試會直接對 `.env.local` 指到的那個 Supabase 專案讀寫，所以**別把它指到有真實資料的專案**。
每個 test 用自己的 uuid 建貼文、收尾只刪自己那幾列（見 [`tests/db.ts`](tests/db.ts)）——
刻意不清空整張表，也因此測試不能假設「清單上只有我這一篇」。

驗的東西：

- 四種頁型的圖片都落在量出來的版位上，且不越過 SWIPE 膠囊（結尾頁沒有膠囊，不套這條）
- 程式碼 chip 的底色、文字色、圓角正確，且沒有撐開行高
- 編輯後重新整理，內容還在
- 匯出的 ZIP 有五張 1080×1350 的 PNG，並直接對 PNG **取樣像素**確認 chip 與圖片
  真的被畫進去了 —— 光看預覽的 DOM 不足以證明 modern-screenshot 有正確處理

取樣座標是從 DOM 量出來後換算成畫布座標，不是寫死的數字，版型調動時不需要跟著改。

測試跑在 dev server 上，所以剛改完原始碼馬上跑可能會撞到 HMR 還沒重編；重跑一次就好。

## 工具鏈

oxlint + oxfmt（取代 ESLint / Prettier），透過 husky + lint-staged 在 commit 前跑。
