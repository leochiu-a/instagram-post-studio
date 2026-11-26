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

User-Agent 是請求裡自己報上名字的那一行，任何爬蟲都能寫上 Googlebot。很多網站為了 SEO 會放行搜尋引擎，只看這行字，假的也會一起進來。

Cloudflare 的 managed rules 裡有一條 Fake Google Bot，專門抓自稱 Googlebot、來源卻驗證不過的請求。

## Cloudflare 怎麼認證 bot

Cloudflare 文件裡的定義：

A Verified bot is a bot or agent that Cloudflare has confirmed is transparent about who it is and what it does: it represents itself honestly and does not abuse the access that honesty earns.

身分可以用公開的 IP 清單、reverse DNS 或替請求簽章來證明。通過之後還要守規矩：遵守 `robots.txt`、請求頻率合理、不攻擊網站，屢次違規的組織，旗下所有 bot 的認證都可能被撤掉。

## 每支 bot 都有一張標籤

通過認證的 bot 會被歸到一個分類。Googlebot、Bingbot 是 Search Engine Crawler，Slack、Discord 貼連結時抓預覽的是 Page Preview，RSS 和 podcast 的更新器是 Feed Fetcher。

分類總共 17 種，寫 WAF 規則時可以拿分類當條件，哪一類放、哪一類擋，由站長自己決定。

## AI 爬蟲分成三種

17 種裡有三種跟 AI 有關，差在抓了內容拿去做什麼。

AI Crawler 抓內容去訓練模型，例子是 ChatGPT 的爬蟲。AI Assistant 是使用者下指令才出動的，像 Perplexity-User、DuckAssistBot。AI Search 負責 AI 搜尋，例子是 OAI-SearchBot。

不想讓文章被拿去訓練，又想被 AI 搜尋找到，就只擋第一種。

## 只擋訓練用的那種

![banner](/post-images/cloudflare-verified-bots/waf-category.webp)

`cf.client.bot` 判斷是不是 verified bot，`cf.verified_bot_category` 拿到分類。條件寫 `cf.verified_bot_category eq "AI Crawler"`、動作選 Block，Googlebot 照樣進得來。

Cloudflare 從 2026/07 起還加了一套看 bot「做什麼」的標籤，加上替請求簽章的細節，這篇裝不下，想看的話在留言跟我說。
