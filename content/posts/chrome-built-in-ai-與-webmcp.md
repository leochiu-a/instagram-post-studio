---
title: "Chrome Built-in AI 與 WebMCP"
handle: "@leo.web.dev"
timestamp: "3 min ago"
theme: "dark"
created: "2026-08-30T15:08:50.000Z"
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

# Built-in AI 與 WebMCP 如何重塑 Web 體驗？

![banner](/post-images/chrome-built-in-ai-與-webmcp/661bbf6a-be7d-4702-acd9-e9f46c76da17.webp)

## 帳單會吐血般的成長

Chrome 官方部落格寫了 Yahoo 奇摩拍賣怎麼用 built-in AI 把上架時間從 20 分鐘壓到 2 分鐘，平均耗時降低 90%，全站上線九個功能。

Yahoo 面臨的問題很現實，只要用雲端 AI，流量一暴增，帳單就會吐血般的成長。

要把 AI 開放給所有賣家，一般會想到讓賣家付訂閱費，或是找個辦法收費。

但很現實的是想到要付錢，使用率就會降低。

## Chrome Built-in AI

Chrome Built-in AI（Chrome 內建 AI）是 Google 為 Chrome 瀏覽器引進的 On-device AI 架構與前端 API 方案。

其核心機制是將小型的生成式 AI 模型（如 Gemini Nano）直接整合並下載至使用者的 Chrome 瀏覽器中，讓網頁開發者可以透過 JavaScript API 在瀏覽器端直接進行 AI 推論。

核心特色

- **零雲端 Token 與後端成本**
- **高隱私保護**
- **低延遲**
- **簡化模型部署**

## 提供的主要 JS API

Chrome Built-in AI 主要分為兩大類 API：

**任務型 API**，針對特定常用場景設計的專用 API， Prompt 與輸出已經過底層預優化，穩定度高：

- **Summarizer API**： 快速產生長文摘要或重點列表。
- **Translator / Language Detector API**： 本地語言偵測與即時翻譯。
- **Writer / Rewriter API**： 輔助撰寫文本、修改語氣或字數縮放。
- **Proofreader API**： 校對文章與文法糾錯。

**通用型 API（Prompt API）**： 讓開發者可以直接傳入自訂的 Prompt，靈活進行分類、簡單推理或結構化輸出。

## Yahoo 導入後的成效

Yahoo 在導入 Built-in AI 的九個功能裡，成效最好的是**個人化推薦與預測式搜尋**。

推薦要用購買紀錄跟瀏覽偏好，這些記錄通常就存在使用者的瀏覽器上，推論可以直接在本地跑，就不用把比較私密的資料傳到伺服器。

在完全不改動任何前端版面的情況下，只替換排序的資料來源，新的推薦模組點擊率接近 3%，舊版商品推薦則是 1.3% 到 1.8%。

## Built-in AI 的工程難點

痛點 1：模型初次下載體驗

- 現象： 第一次使用時模型未下載完，影響使用者體驗。
- 解法： 包成 Web Component，將「下載中 / 不可用 / 就緒」三種狀態集中管理。

痛點 2：換頁中斷推論（SPA/MPA 資源共享）

- 現象： Prompt API 僅限 top-level document，多頁式應用換頁即中斷。
- 解法： 用 `<msc-shared-worker>` 做資源仲介，跨 Tab / 跨頁共用推論，結果寫入 Web Storage 並帶 TTL。

核心結論： 導入重點應在「狀態管理與資源協調」，而非過度調校 Prompt。

## Built-in AI 的應用場景

Built-in AI 不適合的場景：

- **複雜推理、長 context**：Nano 級模型能力不夠
- **全站熱門、同類使用者也買了**：本地模型只看得到這台裝置上的資料
- **定價、風控、合規**：結果要被信賴或稽核

Built-in AI 適合的場景：

- **即時摘要、翻譯、個人化排序**：錯了的代價也不高

Chrome 官方建議的做法是 hybrid，用 Firebase AI Logic 做雲端 fallback。

## WebMCP 的機會

**MCP 的致命缺點是沒有畫面**，純文字對話極度抽象，沒有商品圖、顏色或尺寸選擇器，使用者根本不敢下單。

所以 OpenAI 跟 Google 都提出了相對應的解決方案，把 UI 塞回對話框 `OpenAI` (Apps in ChatGPT) 與 `Google` (Dynamic View) 都在補足視覺介面。

但不適合所有情境，像**找飯店、貨比三家**等複雜需求，直接在**網站原本的搜尋 UI** 上操作，體驗反而更好。

## WebMCP

用一句話來比喻 MCP 就是**從「看櫥窗」變成「直接拿清單」**：

- 現在的 Agent：Agent 像站在櫥窗外**猜按鈕**，猜錯只能重新解析頁面。
- WebMCP：網站直接遞給 Agent 一張**可執行工具清單**：「搜商品、加購物車，你直接呼叫我」。

WebMCP核心運作機是，讓 Agent 用網站原本的 UI 與工具。網站主動宣告支援的 `Action` 與 `Parameters`，Agent 照著調用即可。

但目前處於**實驗性 / 社群草案階段**，適合用作 PoC 驗證，切勿過度依賴於付款或結帳等關鍵路徑。

## agent 預設不會找 tools

現在最大的問題就是，agent 還不認識 WebMCP，所以需要自己寫 skills 告訴 agent 怎麼使用 WebMCP。

沒有明確指令，它第一個動作永遠是截圖或是看網頁結構，然後找按鈕。

但這就像 MCP 剛出來的時候，agent 也不會第一時間就認知道要使用 MCP，所以現在離真正融入大家的生活中還需要一段時間。

## 小結

Built-in AI 讓邊際成本趨近於零，所以它適合的不是「一個很強的 AI 功能」，而是「到處都有的 AI 小功能」。

WebMCP 讓網站更容易被 agent 理解，agent 不必靠解析 DOM 或截圖理解網站。值得投資理解與試作，但關鍵路徑上先不要實作，尤其是付款。

如果大家有興趣閱讀更多資訊，我把更詳盡的分析整理成文章放在留言區，歡迎點擊閱讀。
