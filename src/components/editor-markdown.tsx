"use client";

import { ChevronRightIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface EditorMarkdownProps {
  value: string;
  onChange: (value: string) => void;
}

/** 語法說明裡的行內範例。訊號色留給「正在動作」的東西，這裡只用檯面色分層 */
function Syntax({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-foreground bg-muted rounded-sm px-1 py-0.5 font-mono text-[0.7rem]">
      {children}
    </code>
  );
}

export function EditorMarkdown({ value, onChange }: EditorMarkdownProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/*
        語法說明預設收起來。它是「第一次用要看一次」的東西，攤開來卻永遠佔著
        編輯區正上方兩行，是這一欄視覺上最吵的一塊。用 details 而不是 popover：
        不需要多一個元件，鍵盤與螢幕閱讀器也都原生支援。
      */}
      <details className="group/syntax">
        <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex list-none items-center gap-1 rounded-sm text-xs transition-colors duration-100 outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon className="size-3.5 transition-transform duration-150 group-open/syntax:rotate-90" />
          Markdown 語法
        </summary>
        <p className="text-muted-foreground pt-2 pl-4.5 text-xs leading-relaxed">
          <Syntax># 標題</Syntax> 為封面，<Syntax>## 標題</Syntax> 各切一張內頁（頁碼自動編），
          <Syntax>![](網址)</Syntax> 放圖，<Syntax>- </Syntax> 是項目符號，
          <Syntax>**粗體**</Syntax> 與 <Syntax>`程式碼`</Syntax> 會套用強調色。結尾 CTA
          頁會自動補上。
        </p>
      </details>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-64 flex-1 resize-none font-mono text-sm leading-relaxed"
      />

      {/*
        沒有按鈕：停下來就套用，逐頁那邊也會即時把改動寫回這份草稿——
        兩邊互為對方的投影，不用哪一邊「贏過」哪一邊。
      */}
      <p className="text-muted-foreground text-xs leading-relaxed">
        停止輸入後會自動同步到逐頁；逐頁裡不能用 Markdown 表達的欄位（頁碼、圖片版位、CTA
        數字）在這裡編輯會被重建覆蓋。
      </p>
    </div>
  );
}
