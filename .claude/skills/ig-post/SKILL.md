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

## 行數預算

一行 = 62px。內文區可用 963.66px，有圖時下緣被圖片與間距吃掉：

| 該頁              | 可用高度 | 行數預算 |
| ----------------- | -------- | -------- |
| 不放圖            | 963.66   | 15 行    |
| banner 圖（預設） | 637.05   | 10 行    |
| square 圖         | 525.16   | 8 行     |

換行也照 62px 算，所以一行寫超過寬度就吃掉兩格預算：

- 一般行 23 個中文字換行
- `- ` 項目符號行縮排過，21 個中文字換行
- 空行算一整行（版型刻意保留成一個行高）

**目標是用掉預算的 80～100%**，不是用字數抓。同樣 60 個字，配了圖的頁可能就爆，
不配圖的頁只填到一半。字數這把尺會同時藏住「溢出」與「太稀」兩個相反的問題。
整篇的用量要有落差（60%～95% 之間都正常）—— 八頁齊平在同一個數字本身就不像人寫的。

## 寫貼文

- `# 大標` 一張封面。88px，10 字換行，2 行內最好，上限 3 行。
- 每個 `## 小標` 各切一張內頁，頁碼自動編 01、02…。小標 12 字以內維持單行，
  超出會換行壓到內文區。
- `![](網址)` 放在該頁標題下方，緊接著改用那一頁的圖片預算。
- 結尾 CTA 頁由 `parseMarkdown` 自動補，草稿裡不寫它。它是通用互動頁，不做導流；
  要導流就自己多開一張 `##`。

**用短句，但不要一句一段。** 相關的句子併成一段，段內不手動斷行 ——
交給 23 字自動換。空行是要花一整格預算的，不是標點：拿它當逗號用，
四個空行就是四行，畫面看起來排得很滿，實際文字量只有一半，而且每句都被切成孤島。
一張 2～3 段、每段 2～4 句。刻意的單句只留給封面、引言、金句那 1～2 張。

**`**粗體**`（accent 色）整篇最多 3 張的收束句在用。** 每張都落一次粗體金句，
節奏會變成模板；而且引用別人的話時不要在裡面加粗，那是替他決定重點。
`` `程式碼` `` 標指令與 API（chip）、`- ` 列點（一張最多 4 點）。

版位座標、行數的推導、CTA 頁欄位、深淺配色與圖片來源限制在
[`REFERENCE.md`](REFERENCE.md)；要改單頁而非重建全部頁面時也看那裡。

## 量

行數預算是估算，中英數字寬度不一，唯一的答案是量。

1. `preview_start` 起 `.claude/launch.json` 的 `ig-post-studio`（http://localhost:3210）。
2. 首頁點「新增貼文」進編輯器，左欄預設就停在 Markdown 面板。
3. `read_page` 拿 textarea 的 ref，`form_input` 灌進整份 Markdown。
   Markdown 與逐頁是雙向自動同步的，灌完就直接量，不用按任何按鈕。
4. `javascript_tool` 量每一張內頁。`scrollHeight - clientHeight` 只在溢出時才有值，
   測得出「爆了」但測不出「用了多少」，所以要量內容子元素的實際高度：

   ```js
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
     return { page: i + 1, lines: +(h / 62).toFixed(1), over: el.scrollHeight - el.clientHeight };
   });
   ```

5. 拿每頁的 `lines` 對該頁的預算（15 / 10 / 8）算用量：
   - 超過預算 → 那頁會被裁：拆成新的 `##`、刪句、或拿掉圖片換回 15 行預算。
   - 低於 60% → 那頁太稀。**補的是原文的實體內容，不是形容詞**；沒東西可補就留著，
     不要為了填滿而動用刻意留當缺口的材料。
   - 回到步驟 3 重灌重量。

完成條件：回傳的陣列長度等於草稿裡 `##` 的張數、每一項的 `over` 都是 0，
且每頁用量落在該頁預算的 60～100%。用這份量測結果判斷，不靠看預覽 ——
被裁掉的字在畫面上跟寫得剛好一樣。
