"use client";

import { useId, useState } from "react";
import { Button } from "./ui";
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
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">圖片</span>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <Button onClick={() => document.getElementById(inputId)?.click()}>選擇圖檔</Button>
        {value && (
          <>
            <img src={value} alt="" className="h-9 w-9 rounded object-cover ring-1 ring-white/10" />
            <Button variant="danger" onClick={() => onChange("")}>
              移除
            </Button>
          </>
        )}
      </div>
      {isRemote && (
        <p className="text-xs text-amber-300/80">
          遠端圖片可能因為 CORS 讓匯出失敗，建議改成上傳本機圖檔。
        </p>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
