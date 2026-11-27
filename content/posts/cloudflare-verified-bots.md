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

![banner](/post-images/cloudflare-verified-bots/cover.webp)

## 任何爬蟲都能自稱 Googlebot

![banner](/post-images/cloudflare-verified-bots/fake-googlebot.webp)

為了讓 Google 收錄網頁，很多網站會放行 Googlebot。但 `User-Agent` 是請求方自己設定的，其他爬蟲也能設定 Googlebot。

Cloudflare 的 Managed Rules 有一條 `Fake Google Bot`，專抓自稱 Googlebot，但來源卻驗不過的請求。

## 怎麼確認爬蟲是真是假？

那真的 Googlebot 呢？Cloudflare 有一份 Verified Bot 名單，收的是確認過身分的爬蟲，Googlebot 就在上面。爬蟲業者可以申請加入，申請時要說明誰在跑這支爬蟲、拿來做什麼。Cloudflare 會用公開的 IP 清單、反向 DNS 或請求簽章確認身分。

認證後還得遵守 `robots.txt`、控制抓取頻率，不能攻擊網站。如果同一個組織反覆違規，旗下所有 bot 都可能被撤銷認證。

## 每支 bot 都有分類標籤

在 verified bot 名單上的每支 bot 都會被歸到一個分類，總共 17 種。

像 Googlebot 是 Search Engine Crawler，你在 Slack 或 Discord 貼連結時跑來抓預覽的，則是 Page Preview。

在 Cloudflare 的防火牆（WAF）寫規則時，可以直接拿這些分類當條件。

## 與 AI 相關的三種分類

如果你想讓文章出現在 AI 搜尋結果裡，又介意內容被抓去訓練模型，寫 WAF 規則時會遇到這三個分類。

- AI Crawler：抓網頁做訓練資料，像 `GPTBot`
- AI Assistant：叫了才來，像 `Perplexity-User`
- AI Search：做搜尋索引，像 `OAI-SearchBot`

## WAF 只擋訓練用爬蟲

![banner](/post-images/cloudflare-verified-bots/waf-category.webp)

在 WAF 的 Custom Rules 裡，用 `cf.client.bot` 限定已驗證的 bot，再加上 `cf.verified_bot_category eq "AI Crawler"`。動作選 Block，Googlebot 照樣能進站。

Cloudflare 在 2026 年 7 月加了新的行為標籤。想看新標籤或請求簽章怎麼用，可以留言跟我說。
