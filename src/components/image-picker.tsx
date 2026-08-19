"use client";

import { ImagePlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { fileToDataUrl } from "@/lib/export";

interface ImagePickerProps {
  value: string;
  onChange: (value: string) => void;
}

/** 上傳的圖片會存成 data URL，遠端網址則會提醒可能因 CORS 匯不出來。 */
export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const inputId = useId();
  const [error, setError] = useState("");
  const isRemote = /^https?:/.test(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await fileToDataUrl(file));
      setError("");
    } catch {
      setError("讀取圖檔失敗，換一張試試。");
    }
  };

  return (
    // relative 是必要的：底下那個 sr-only 的 file input 是 position: absolute，
    // 沒有定位祖先的話它的 containing block 會是整份文件，
    // 於是逃出左欄的捲動容器、把整頁撐長（右邊會多一條頁面 scrollbar）。
    <Field className="relative" data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={inputId}>圖片</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <ImagePlusIcon data-icon="inline-start" />
          選擇圖檔
        </Button>
        {value && (
          <>
            <img src={value} alt="" className="ring-border size-8 rounded-sm object-cover ring-1" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="移除圖片"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onChange("")}
            >
              <XIcon />
            </Button>
          </>
        )}
      </div>

      {isRemote && (
        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>
            遠端圖片可能因為 CORS 讓匯出失敗，建議改成上傳本機圖檔。
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Field>
  );
}
