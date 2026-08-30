---
title: "Vite+ 前端工具鏈全解析"
handle: "@leo.web.dev"
timestamp: "3 min ago"
theme: "dark"
created: "2026-08-20T05:23:43.232Z"
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

# Vite+ 來了，前端工具鏈的全面進化

![banner](/post-images/vite-前端工具鏈全解析/45eeea34-258c-4b0e-8861-aea5c5a21a4a.webp)

## 前言

2026 年 3 月，在荷蘭阿姆斯特丹舉辦的 Vue.js Amsterdam 大會上，VoidZero 正式發布了 Vite Plus。

這是 Vite 工具鏈的全面性進化，如果你是前端開發者，這絕對是你今年最不能錯過的消息。

## 一個工具，取代全部

過去開一個新專案，你得花大量時間安裝和設定各種工具：ESLint 負責 Lint、Prettier 負責格式化、Vitest 負責測試、Vite 負責打包。

Vite+ 的目標很簡單：把 **Vite、Vitest、Rolldown、Oxlint、Oxfmt、tsdown** 全部整合進一個統一的工具鏈。

## 核心指令

Vite+ 的 CLI 統一使用 `vp` 作為入口，涵蓋開發流程的每個階段：

- `vp dev` 啟動支援 HMR 的開發伺服器
- `vp check` 同時執行格式化、Lint 與型別檢查
- `vp test` 透過 Vitest 執行單元測試
- `vp build` 使用 Rolldown 進行生產環境打包
