"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  ImageMinusIcon,
  ImagePlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/image-upload";
import type { slideOps } from "./editor-slides";
import type { Slide } from "@/lib/types";

/**
 * 工具列上的按鈕，跟 PNG 那顆同一個樣式。工具列每張都常駐，所以平常只是
 * 檯面上的淡灰 icon，指到才浮出底色 —— 主角是畫布，不是工具。
 * 32px 是 Canva 頁面工具列的大小；
 * 手機寬度下縮到 28px，整條才放得進一張卡片的寬。
 */
const BAR_BUTTON = "text-muted-foreground/70 hover:bg-muted hover:text-foreground max-sm:size-7";

/**
 * 工具列上的一顆 icon 按鈕，指到時浮出名稱。用 Tooltip 而不是 title：
 * title 要停一秒多才出現、樣式是系統的，而且觸控螢幕完全看不到。
 */
export function Tool({
  label,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            className={cn(BAR_BUTTON, className)}
            {...props}
          />
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <span aria-hidden className="bg-border mx-1 h-5 w-px" />;
}

interface SlideToolbarProps {
  ops: ReturnType<typeof slideOps>;
  slide: Slide;
  index: number;
  count: number;
  /** 上傳的圖以貼文 id 分資料夾 */
  postId: string;
}

/**
 * 每張預覽正上方那條浮動工具列裡的頁面動作 —— Canva 在每一頁上方放的
 * 也是這一排：排序、加頁、刪除，再加上這張的圖。文字不在這裡，直接點畫布改。
 * 全部只放 icon，手機寬度下整條才塞得進一張卡片的寬。
 */
export function SlideToolbar({ ops, slide, index, count, postId }: SlideToolbarProps) {
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    setUploading(true);
    try {
      ops.patch(slide.id, { imageUrl: await uploadImage(picked, postId) });
    } catch (cause) {
      toast.error("上傳失敗", { description: (cause as Error).message || "換一張試試。" });
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <>
      <Tool label="上移" disabled={index === 0} onClick={() => ops.move(index, -1)}>
        <ChevronUpIcon />
      </Tool>
      <Tool label="下移" disabled={index === count - 1} onClick={() => ops.move(index, 1)}>
        <ChevronDownIcon />
      </Tool>
      <Tool label="在後面加一張內頁" onClick={() => ops.addContent(index)}>
        <PlusIcon />
      </Tool>
      <Tool label="刪除這一頁" onClick={() => ops.remove(slide.id)}>
        <Trash2Icon />
      </Tool>

      <Divider />

      <input
        ref={file}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void pick(event.target.files?.[0])}
      />
      <Tool
        label={slide.imageUrl ? "換圖" : "加圖"}
        disabled={uploading}
        onClick={() => file.current?.click()}
      >
        {uploading ? <Spinner /> : <ImagePlusIcon />}
      </Tool>
      {slide.imageUrl && (
        <Tool label="移除圖片" onClick={() => ops.patch(slide.id, { imageUrl: "" })}>
          <ImageMinusIcon />
        </Tool>
      )}

      <Divider />
    </>
  );
}
