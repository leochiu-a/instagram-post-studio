"use client";

import { Button, TextArea } from "./ui";

interface EditorMarkdownProps {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onPullFromSlides: () => void;
}

export function EditorMarkdown({
  value,
  onChange,
  onApply,
  onPullFromSlides,
}: EditorMarkdownProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-xs leading-relaxed text-neutral-400">
        <code className="text-sky-300"># 標題</code> 為封面，
        <code className="text-sky-300">## 標題</code> 各切一張內頁（頁碼自動編），
        <code className="text-sky-300">![](網址)</code> 放圖，
        <code className="text-sky-300">- </code> 是項目符號，
        <code className="text-sky-300">**粗體**</code> 與{" "}
        <code className="text-sky-300">`程式碼`</code> 會套用強調色。結尾 CTA 頁會自動補上。
      </p>
      <TextArea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onApply}>
          套用到頁面
        </Button>
        <Button onClick={onPullFromSlides}>用目前頁面覆蓋草稿</Button>
      </div>
      <p className="text-xs text-amber-300/80">
        「套用到頁面」會重建所有頁面，逐頁微調過的內容會被覆蓋。
      </p>
    </div>
  );
}
