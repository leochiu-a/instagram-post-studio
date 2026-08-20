"use client";

import { ImagePlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { isManagedImage, uploadImage } from "@/lib/image-upload";

interface ImagePickerProps {
  postId: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * 選到的圖直接上傳到 Supabase Storage，欄位存的是公開網址。
 * 之前存 data URL 是因為沒有後端，但那會把整張圖塞進貼文的 JSON 裡 ——
 * 一篇多圖的貼文光是自己就好幾 MB。
 */
export function ImagePicker({ postId, value, onChange }: ImagePickerProps) {
  const inputId = useId();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  /** 只有不是我們 bucket 的外部網址才要擔心 CORS */
  const isForeign = /^https?:/.test(value) && !isManagedImage(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      onChange(await uploadImage(file, postId));
    } catch (cause) {
      setError((cause as Error).message || "上傳失敗，換一張試試。");
    } finally {
      setUploading(false);
    }
  };

  return (
    // relative 是必要的：底下那個 sr-only 的 file input 是 position: absolute，
    // 沒有定位祖先的話它的 containing block 會是整份文件，
    // 於是逃出左欄的捲動容器、把整頁撐長（右邊會多一條頁面 scrollbar）。
    <Field className="relative" data-invalid={error ? true : undefined}>
      {/* 這個 label 綁的是 file input，點下去會開檔案視窗 ——
          跟其他只是聚焦文字欄位的 label 不一樣，游標要跟著改 */}
      <FieldLabel htmlFor={inputId} className="w-fit cursor-pointer">
        圖片
      </FieldLabel>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {uploading ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ImagePlusIcon data-icon="inline-start" />
          )}
          {uploading ? "上傳中…" : "選擇圖檔"}
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

      {isForeign && (
        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>
            外部網址的圖片可能因為 CORS 讓匯出失敗，建議改成上傳本機圖檔。
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
