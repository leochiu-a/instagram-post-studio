---
title: "Cloudflare Verified Bots"
handle: "@leo.web.dev"
timestamp: "3 min ago"
theme: "dark"
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

# Cloudflare Verified Bots 是什麼？

![](/post-images/cloudflare-verified-bots/cover.webp)

## 冒牌 Googlebot

![](/post-images/cloudflare-verified-bots/fake-googlebot.webp)

很多網站為了讓 Google 收錄，會直接放行 Googlebot。但 `User-Agent` 是請求方自己填的，誰都能寫 Googlebot。`robots.txt` 也攔不住不照做的爬蟲。

Cloudflare 的 Managed Rules 有一條 `Fake Google Bot`，專抓自稱 Googlebot、來源卻驗不過的請求。

## 怎麼驗身分？

![](/post-images/cloudflare-verified-bots/verify-flow.webp)

真的 Googlebot 在 Cloudflare 的 Verified Bot 名單上。爬蟲業者也能申請加入，要說清楚誰在跑這支爬蟲、拿來做什麼。Cloudflare 會用公開的 IP 清單、反向 DNS 或請求簽章確認身分。

通過認證後，爬蟲得遵守 `robots.txt`、控制抓取頻率，也不能攻擊網站。同一個組織屢次違規，Cloudflare 可能取消旗下所有 bot 的認證。

## 爬蟲怎麼分類？

Cloudflare 把名單上的 bot 分成 17 類。Googlebot 屬於 Search Engine Crawler。你在 Slack 或 Discord 貼連結時，來抓預覽的 bot 屬於 Page Preview。

寫 Cloudflare 防火牆（WAF）規則時，可以用這些分類當條件。

不在名單上的請求，Cloudflare 會用機器學習打一個 bot score，1 到 99 分，越低越像機器人，低於 30 分通常就是 bot。完整分數要 Enterprise 加購 Bot Management 才看得到。

## 三種 AI 爬蟲

想讓 AI 搜尋找到文章，又想擋掉訓練爬蟲？先看這三類 bot 各自來做什麼。

- AI Crawler：抓網頁做訓練資料，像 `GPTBot`
- AI Assistant：叫了才來，像 `Perplexity-User`
- AI Search：做搜尋索引，像 `OAI-SearchBot`

## 用 WAF 擋訓練爬蟲

![](/post-images/cloudflare-verified-bots/waf-category.webp)

以前各方案的 bot 設定預設都略過 verified bots。現在各方案都能決定要不要放行 AI Crawler。

在 WAF 的 Custom Rules 新增規則，條件填 `cf.verified_bot_category eq "AI Crawler"`，動作選 Block。

這條規則只擋訓練爬蟲。Googlebot 分在別類，還是進得來。
