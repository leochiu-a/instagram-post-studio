---
title: "Cloudflare Verified Bots"
handle: "@leo.web.dev"
timestamp: "3 min ago"
theme: "light"
created: "2026-11-24T12:00:00.000Z"
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

# 只擋 AI 爬蟲，不擋 Google

## 任何爬蟲都能自稱 Googlebot

![banner](/post-images/cloudflare-verified-bots/fake-googlebot.webp)

User-Agent 說穿了就是請求裡自己報上名號的那一行，誰想寫 Googlebot 都可以。很多網站為了顧 SEO 習慣直接放行搜尋引擎，但如果只認這行字，一堆假爬蟲也就跟著混進來了。

如果有用 Cloudflare，它的 managed rules 裡其實內建了一條 `Fake Google Bot`，專門抓這種自稱 Googlebot，但來源根本驗不過的冒牌貨。

## 怎麼確認爬蟲是真是假？

要在 Cloudflare 拿到 Verified bot（已驗證爬蟲）的資格，前提是爬蟲必須誠實表明身分和用途。Cloudflare 會透過公開 IP 清單、reverse DNS 或是請求簽章來驗明正身。

但驗過身分只是第一步，後續還得守規矩：乖乖讀 `robots.txt`、控制抓取頻率、不攻擊網站。要是累犯違規，整個組織底下的 bot 認證都可能會被拔掉。

## 每支 bot 都有分類標籤

拿到認證的 bot 會依照用途被分進 17 種類別。像是 Googlebot 屬於 Search Engine Crawler，而平常在 Slack 或 Discord 貼連結時跑來抓預覽圖的，則歸類在 Page Preview。

寫 WAF 規則時，可以直接拿分類當條件。

## 與 AI 相關的三種分類

在這 17 種分類裡，跟 AI 有關的一共有三種，差別在於它們把資料抓回去之後要幹嘛：

- **AI Crawler**：抓回去訓練模型用的，例如 OpenAI 用來訓練的爬蟲。
- **AI Assistant**：使用者叫它去看網頁時才會出動，像是 `Perplexity-User`。
- **AI Search**：用來建立 AI 搜尋索引的，像是 `OAI-SearchBot`。

如果你的底線是「文章可以出現在 AI 搜尋結果裡，但不想被拿去免費練模型」，那只要針對第一種下手就夠了。

## WAF 只擋訓練用爬蟲

![banner](/post-images/cloudflare-verified-bots/waf-category.webp)

Custom Rules 裡先用 `cf.client.bot` 確認是已驗證的 bot，再用 `cf.verified_bot_category` 拿分類。

條件寫 `cf.verified_bot_category eq "AI Crawler"`、動作選 Block，Googlebot 照樣進得來。

Cloudflare 從 2026/07 起還多了一套看 bot「做什麼」的標籤，加上請求簽章的細節，這篇塞不下，想看留言跟我說。
