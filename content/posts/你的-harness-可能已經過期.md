---
title: "你的 Harness 可能已經過期"
handle: "@leo.web.dev"
timestamp: "3 min ago"
theme: "dark"
created: "2026-08-30T04:39:54.215Z"
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

# 你的 AI Agent 正在用過期的 Harness 嗎？

![banner](/post-images/你的-harness-可能已經過期/cdffe096-bb68-41b6-8519-0279d333c259.webp)

## 經常撞到使用上限

2026/03 前後，我們團隊常常有人說他又撞到 Claude Code 5 小時的使用上限。

那陣子大家都在弄 harness，加 sub-agent、加 hook、`CLAUDE.md` 一直長，再加上各種 skills。而 SDD 框架最明顯的副作用，就是 token 消耗量變得很大。

更麻煩的是，前期產生的那一大票文件，人其實也很難 review 到底對不對。

## Harness 會過期

HashiCorp 創辦人 Mitchell Hashimoto 於 2026 年 2 月發表 AI 開發經驗分享後，提出了 Harness Engineering 的概念。

隨後被 Anthropic、OpenAI 及 LangChain 等團隊高度引述與發展，並被歸納為 Agent = Model + Harness 這個核心公式。

Anthropic 的定義：harness 裡的每一個部分，都是在描述「模型自己做不到什麼」的假設，而這些假設會隨著模型變強而迅速過期。

Opus 4.6 出來之後，他們直接把整個 sprint contract 的結構砍掉了。模型已經能自己撐完兩個多小時的開發。

## 最容易過期的 harness

「prompt 再好，模型也不知道你的 codebase 長什麼樣。」這句話之前可能是對的。

但是現在 agent 有 Grep，它會自己去看。所以「先把 codebase 摘要好餵給它」，很多時候已經是一段過期的 harness。

還有許多容易過期的 harness，例如超詳細的 step-by-step 引導，或是繁複的 context 壓縮與記憶維護。

這些在 2025 年到 2026 年初的時候，都是大家經常在討論的議題，但是隨著模型越來越強，這些議題也慢慢淡出大家的視野。

## Loop Engineering

Boris Cherny（Anthropic Claude Code 團隊負責人）：

I don't prompt Claude anymore. I have loops running that prompt Claude and figuring out what to do. My job is to write loops.

在 Loop 的概念被提出來之後，現在 Harness 會被說是靜態、事前的規範與約束，而 Loop 是動態、事後的自動化驗證與修正迴圈。

Claude Code 其實已經內建了 Loop，開發前端時，agent 通常會用 Playwright 去驗證畫面，現在就算不用特別說，agent 也會自動去驗證實作，形成閉環。

## 什麼 Harness 值得留下來

最值得留在 harness 裡的是「團隊專屬的冷門規則」，例如「Changeset 必須附上特定格式的 Jira 單號」這種高度情境化、非通用的規範，模型無法憑常識推論。

把省下來的 token 留給測試跟 CI，絕對比花在寫死 `PLAN.md` 上划算。

## 也許你不需要太多 harness

過期 harness 的共通點：我們試圖用文字替模型做太多它已經能自己完成的事。

但給 AI 規劃自由，不等於讓出最終控制權。涉及影響範圍廣的任務時，授權依然必須保守。

近期像 Matt Pocock 的 `/grill-me`、`/implement` 這種極度輕量化的 skill 會紅，就是這個原因。

我在文章裡面把「你的 Harness 可能已經過期」這件事講得更加完整，有興趣的話可以參考留言區。
