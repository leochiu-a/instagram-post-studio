"use client";

import { ChevronRightIcon, UndoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditorMarkdownProps {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onPullFromSlides: () => void;
}

/** 語法說明裡的行內範例。訊號色留給「正在動作」的東西，這裡只用檯面色分層 */
function Syntax({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-foreground bg-muted rounded-sm px-1 py-0.5 font-mono text-[0.7rem]">
      {children}
    </code>
  );
}

export function EditorMarkdown({
  value,
  onChange,
  onApply,
  onPullFromSlides,
}: EditorMarkdownProps) {
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
        一個動作只講一次：主要按鈕滿版、後果寫成它底下的一行小字，
        反向的「用頁面覆蓋草稿」降成 ghost。原本主次同大小並排、底下再掛一張
        警告卡，同一件事被講了三次。
      */}
      <div className="flex flex-col items-start gap-2 pt-1">
        <Button className="w-full" onClick={onApply}>
          套用到頁面
        </Button>
        <p className="text-muted-foreground text-xs leading-relaxed">
          會重建所有頁面，逐頁微調過的內容將被覆蓋。
        </p>
        <Button variant="ghost" size="xs" onClick={onPullFromSlides}>
          <UndoIcon data-icon="inline-start" />
          用目前頁面覆蓋草稿
        </Button>
      </div>
    </div>
  );
}
