"use client";

import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        <Syntax># 標題</Syntax> 為封面，<Syntax>## 標題</Syntax> 各切一張內頁（頁碼自動編），
        <Syntax>![](網址)</Syntax> 放圖，<Syntax>- </Syntax> 是項目符號，
        <Syntax>**粗體**</Syntax> 與 <Syntax>`程式碼`</Syntax> 會套用強調色。結尾 CTA 頁會自動補上。
      </p>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-64 resize-none font-mono text-xs leading-relaxed"
      />

      <ButtonGroup>
        <Button onClick={onApply}>套用到頁面</Button>
        <Button variant="outline" onClick={onPullFromSlides}>
          用目前頁面覆蓋草稿
        </Button>
      </ButtonGroup>

      <Alert>
        <TriangleAlertIcon />
        <AlertDescription>
          「套用到頁面」會重建所有頁面，逐頁微調過的內容會被覆蓋。
        </AlertDescription>
      </Alert>
    </div>
  );
}
