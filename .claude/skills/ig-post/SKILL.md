---
name: ig-post
description: 產出 IG Post Studio 吃得下、而且不會溢出被裁字的貼文 Markdown，含把文章改寫成逐張文案、留好奇缺口導流、配圖建議。當使用者要生成一篇 IG 貼文、把文章或技術筆記改成貼文，或既有的貼文 Markdown 需要量過溢出、重新分頁時使用。觸發詞：IG 貼文、IG post、輪播、carousel、slide 文案、貼文文案、把文章改成貼文、導流貼文。
---

# IG 貼文 Markdown

版型的內文區是 `overflow: hidden`（`src/components/slide-card.tsx` 的 `ContentArea`）：
**溢出**的字會被靜默裁掉，畫面上沒有任何提示，匯出的 PNG 也就少了那幾行。
所以寫貼文等於在編**行數預算**，而預算有沒有守住只能在 studio 裡量出來。

要寫什麼（骨架、封面 hook、留缺口、配圖建議、caption）看
[`COPY.md`](COPY.md)。這份只管怎麼把它裝進版型。

## 交付物是一個檔案

一篇貼文就是 `content/posts/<slug>.md`（`src/lib/post-file.ts`）：frontmatter 放
Markdown 表達不了的欄位，正文就是草稿。**檔案就是真相** —— 頁面不存檔，是讀檔時
用 `parseMarkdown` 現算的，所以寫檔就等於改貼文，不必經過編輯器。

```yaml
---
title: "Chrome Built-in AI 與 WebMCP" # 清單上的名字，不是封面大標
handle: "@leo.web.dev"
timestamp: "3 min ago"
theme: "light" # light / dark
created: "2026-08-30T15:08:50.000Z" # 清單排序用，建立後不再動它
cta:
  subhead: "分享給你的朋友吧！"
  headline: "這篇貼文對你有幫助嗎？"
  stats:
    - "560"
    - "204"
    - "427"
    - "318"
  image: ""
---
```

少寫欄位不會報錯，會靜靜地變成別的樣子：`theme` 掉了整篇變深色、`title` 掉了用
檔名頂替、`handle` 與 `timestamp` 掉了封面就少一行帳號。`cta` 那四個數字整組照抄，
其餘每篇自己填。

檔名由 `title` 轉出來（`slugify`）：轉小寫、空白與底線變 `-`、中文原樣保留、
其餘符號刪掉，所以 `harness 驗證用` → `harness-驗證用.md`，網址是
`/post/harness-驗證用`（含中文，丟給瀏覽器工具時它會自己 encode）。圖片複製一份到
`public/post-images/<slug>/`，正文引用 `/post-images/<slug>/<檔名>` 這種相對路徑
—— 貼外站網址匯出時會撞 CORS。

## 行數預算

一行 = 62px。內文區可用 963.66px，有圖時下緣被圖片與間距吃掉：

| 該頁              | 可用高度 | 行數預算 |
| ----------------- | -------- | -------- |
| 不放圖            | 963.66   | 15 行    |
| banner 圖（預設） | 637.05   | 10 行    |
| square 圖         | 525.16   | 8 行     |

換行也照 62px 算，所以一行寫超過寬度就吃掉兩格預算：

- 一般行 23 個中文字換行
- 空行算一整行（版型刻意保留成一個行高）
- `- ` 項目符號行縮排過，21 個中文字換行（很少用到，見 COPY.md）

**用量用預算的百分比看，不是用字數抓。** 同樣 60 個字，配了圖的頁可能就爆，
不配圖的頁只填到一半；字數這把尺會同時藏住「溢出」與「太稀」兩個相反的問題。

唯一的硬條件是不溢出。**其餘看落差**：一篇裡最滿的那張與最空的那張，至少差
25 個百分點。實際跑過的一篇是 67 / 100 / 87 / 93 / 47 / 73 —— 有一張塞到滿，
也有一張只用 47%（那張是引言，本來就該空）。六頁都在 85% 上下才是機器排出來的。

所以低於 60% 的那張不必然要補。先問它為什麼空：**空得有理由**（引言、金句、
一句話的轉折）就留著；**只是沒東西寫**才補，而且補的是原文的實體內容 ——
從隔壁小節搬材料過來把兩個論點塞進一張，比一張只有 50% 更糟。

## 寫貼文

- `# 大標` 一張封面。88px，10 字換行，2 行內最好，上限 3 行。
- 每個 `## 小標` 各切一張內頁，頁碼自動編 01、02…。小標一定要單行 —— 換行會壓到
  內文區，也會撞到頁碼。中文大概 12 字，但中英混排差很多（`Agent = Model + Harness`
  也還是單行），所以跟內文一樣用量的，別用字數猜。
- `![banner](網址)` 放在該頁標題下方，那一頁就改用圖片的預算（封面除外 —— 封面是
  另一套座標，圖片不吃任何內文預算）。版位寫在 alt 裡（`banner` / `square` /
  `none`），認不得的 alt 當成 banner。
- 結尾 CTA 頁由 `parseMarkdown` 自動補在最後，正文裡不寫它 —— 它的四個欄位走
  frontmatter 的 `cta`。它是通用互動頁，不做導流：導流句寫成最後一張內頁的
  最後一段（一句話，指到留言區）。

**用短句，但不要一句一段。** 相關的句子併成一段，段內不手動斷行 ——
交給 23 字自動換。空行是要花一整格預算的，不是標點：拿它當逗號用，
四個空行就是四行，畫面看起來排得很滿，實際文字量只有一半，而且每句都被切成孤島。
一張 2～3 段、每段 2～4 句。刻意的單句只留給封面、引言、金句那 1～2 張。

**粗體（accent 色）的預設是不用。** 整篇 0 處是正常的，最多 1～2 處 ——
每張都落一次粗體金句，節奏就變成模板；引用別人的話時更不要在裡面加粗，
那是替他決定重點。列點同理：整篇 0～1 張有 `- ` 就夠（一張最多 4 點），
一段講得完的事不要拆成三個 bullet。
`` `程式碼` `` 標指令與 API（chip）、`*斜體*` 標書名與外語詞。
三種行內標記互斥，`***又粗又斜***` 版型畫不出來，會原封不動印出星號。

**版型只認得這四種語法：`**粗體**`、`*斜體*`、`` `code` ``、`- ` 列點**
（`src/components/rich-text.tsx`）。其餘一律當純文字原樣印出來，包括
`> blockquote`、`#### ` 小標、`1. ` 有序列表、`[文字](連結)`。
原文的引言是 blockquote，搬過來時要把 `>` 拿掉 —— 引言怎麼排看 COPY.md。

版位座標、行數的推導、CTA 頁欄位、深淺配色與圖片來源限制在
[`REFERENCE.md`](REFERENCE.md)；要改單頁而非重建全部頁面時也看那裡。

## 量

行數預算是估算，中英數字寬度不一，唯一的答案是量。

1. 把檔案寫進 `content/posts/<slug>.md`（含 frontmatter）。檔案就是草稿，
   不用開編輯器把 Markdown 貼進 textarea。
2. 開 `http://localhost:3210/post/<slug>`。server 沒跑就用 `preview_start` 起
   `.claude/launch.json` 的 `ig-post-studio`；已經在跑（很常見，會回「port 被占用」）
   就直接 `navigate` 過去。`navigate` 的回傳只會顯示 origin，看起來像沒進去，
   用 `location.href` 確認就好。改完檔案 `location.reload()` 就是新的一份。
3. `javascript_tool` 量每一張內頁。`scrollHeight - clientHeight` 只在溢出時才有值，
   測得出「爆了」但測不出「用了多少」，所以要量內容子元素的實際高度：

   ```js
   // 這個 filter 只會抓到內頁：封面與 CTA 頁沒有 40px 的內文層，不在陣列裡
   const containers = [...document.querySelectorAll(".bench [data-slide-id] div")].filter((el) => {
     const s = getComputedStyle(el);
     return s.overflow === "hidden" && s.fontSize === "40px";
   });
   const card = document.querySelector(".bench [data-slide-id]");
   const scale = card.getBoundingClientRect().width / 1080;
   containers.map((el, i) => {
     const kids = [...el.children];
     const h = kids.length
       ? (kids.at(-1).getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top) / scale
       : 0;
     const budget = el.querySelector("img") ? 10 : 15; // square 圖是 8，自己改
     return {
       page: i + 1,
       lines: +(h / 62).toFixed(1),
       pct: Math.round((h / 62 / budget) * 100),
       over: el.scrollHeight - el.clientHeight,
     };
   });
   ```

4. 看每頁的 `pct`：
   - `over > 0` → 那頁會被裁：拆成新的 `##`、刪句、或拿掉圖片換回 15 行預算。
   - 全篇的 max - min < 25，或同一個數字出現三張以上 → 排得太平均。
     **往下刪，不要往上補** —— 挑一張削到剩骨架就好，補內容會逼你寫原文沒有的東西。
   - 某頁很空 → 照〈行數預算〉那節判斷該補還是該留。
5. 哪一頁超出，就再往下量那一頁的每一段（`containers[n]` 是第 n+1 張）：

   ```js
   const card = document.querySelector(".bench [data-slide-id]");
   const scale = card.getBoundingClientRect().width / 1080;
   const containers = [...document.querySelectorAll(".bench [data-slide-id] div")].filter((el) => {
     const st = getComputedStyle(el);
     return st.overflow === "hidden" && st.fontSize === "40px";
   });
   [...containers[5].children].map((k) => ({
     text: k.textContent.slice(0, 12),
     lines: +(k.getBoundingClientRect().height / scale / 62).toFixed(2),
   }));
   ```

   總行數 = 各段行數 + 段落之間的空行（每個空行 1 行）。只差一行的時候刪字通常
   刪不掉那一行 —— 要嘛把某一段從 3 行壓成 2 行，要嘛把兩段併成一段省掉一個空行。
   看總數猜著改，會改三輪還在同一個數字。

6. 回到步驟 1 改檔案，重量。

完成條件（四項都要量過，不靠看預覽 —— 被裁掉的字在畫面上跟寫得剛好一樣）：

1. 內頁陣列長度 = 草稿裡 `##` 的張數，每一項 `over` 都是 0。
2. 全篇 `pct` 的 max - min ≥ 25。
3. 封面大標 ≤ 3 行（`bottom` < 1214）。
4. 每個小標的高度 ≤ 83（單行；下面第三段腳本）。

封面大標另外量一次，它不在上面那組容器裡：

```js
const cover = document.querySelector(".bench [data-slide-id]");
const scale = cover.getBoundingClientRect().width / 1080;
const h1 = [...cover.querySelectorAll("div")].find(
  (el) => getComputedStyle(el).fontSize === "88px",
);
({
  text: h1.textContent,
  lines: +(h1.getBoundingClientRect().height / scale / 132).toFixed(2),
  bottom: (h1.getBoundingClientRect().bottom - cover.getBoundingClientRect().top) / scale,
});
```

3 行是上限（`bottom` 要 < 1214），第 4 行會壓到 SWIPE 膠囊。

小標（58.67px、行高 82.14）也量一次，>83 就是換行了。頁碼是同一個字級，會一起被
抓出來，正常。每一段腳本都要自己完整可跑 —— `javascript_tool` 不會記得上一次
定義的變數：

```js
const scale = document.querySelector(".bench [data-slide-id]").getBoundingClientRect().width / 1080;
[...document.querySelectorAll(".bench [data-slide-id] div")]
  .filter((el) => getComputedStyle(el).fontSize === "58.67px")
  .map((el) => ({
    text: el.textContent,
    h: +(el.getBoundingClientRect().height / scale).toFixed(1),
  }));
```
