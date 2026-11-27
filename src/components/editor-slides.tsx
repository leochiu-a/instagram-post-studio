"use client";

import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { ImagePicker } from "./image-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemHeader, ItemTitle } from "@/components/ui/item";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { makeCtaSlide } from "@/lib/markdown";
import { KIND_LABEL, newId, type Slide } from "@/lib/types";

/**
 * 動到頁面結構的操作。逐頁表單（桌機）與預覽底下的控制列（窄螢幕）共用，
 * 兩邊改的都是同一份 slides。
 */
export function slideOps(slides: Slide[], onChange: (slides: Slide[]) => void) {
  const patch = (id: string, changes: Partial<Slide>) =>
    onChange(
      slides.map((slide) => (slide.id === id ? ({ ...slide, ...changes } as Slide) : slide)),
    );

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (id: string) => onChange(slides.filter((slide) => slide.id !== id));

  const addContent = (index: number) => {
    const next = [...slides];
    next.splice(index + 1, 0, {
      id: newId(),
      kind: "content",
      badge: "",
      heading: "新頁標題",
      body: "",
      imageUrl: "",
    });
    onChange(next);
  };

  return { patch, move, remove, addContent };
}

type SlideOps = ReturnType<typeof slideOps>;

/** 上移、下移、在後面加一張內頁、刪除 */
function SlideActions({
  ops,
  slide,
  index,
  count,
}: {
  ops: SlideOps;
  slide: Slide;
  index: number;
  count: number;
}) {
  return (
    <ItemActions className="gap-1">
      <ButtonGroup>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => ops.move(index, -1)}
          disabled={index === 0}
          aria-label="上移"
        >
          <ChevronUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => ops.move(index, 1)}
          disabled={index === count - 1}
          aria-label="下移"
        >
          <ChevronDownIcon />
        </Button>
      </ButtonGroup>
      <Button variant="ghost" size="xs" onClick={() => ops.addContent(index)}>
        <PlusIcon data-icon="inline-start" />
        內頁
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="刪除這一頁"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => ops.remove(slide.id)}
      >
        <Trash2Icon />
      </Button>
    </ItemActions>
  );
}

/** 清單最後的「新增內頁」與「結尾 CTA」 */
export function AddSlideButtons({
  slides,
  onChange,
}: {
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
}) {
  const { addContent } = slideOps(slides, onChange);
  const hasCta = slides.some((slide) => slide.kind === "cta");
  return (
    <div className="flex gap-2 pb-2">
      <Button variant="secondary" size="sm" onClick={() => addContent(slides.length - 1)}>
        <PlusIcon data-icon="inline-start" />
        新增內頁
      </Button>
      {!hasCta && (
        <Button variant="secondary" size="sm" onClick={() => onChange([...slides, makeCtaSlide()])}>
          <PlusIcon data-icon="inline-start" />
          結尾 CTA
        </Button>
      )}
    </div>
  );
}

interface EditorSlidesProps {
  /** 上傳的圖以貼文 id 分資料夾，所以圖片欄位要知道自己屬於哪一篇 */
  postId: string;
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
  activeId: string | null;
  onFocus: (id: string) => void;
}

export function EditorSlides({ postId, slides, onChange, activeId, onFocus }: EditorSlidesProps) {
  const ops = slideOps(slides, onChange);
  const { patch } = ops;

  return (
    <div className="flex shrink-0 flex-col gap-3">
      {slides.map((slide, index) => (
        <Item
          key={slide.id}
          render={<section />}
          variant="muted"
          onFocus={() => onFocus(slide.id)}
          className={cn(
            /*
              flex-nowrap 是必要的：Item 底層是 flex-wrap，改成 flex-col 之後
              「換行」的意思就變成「往右邊換一欄」—— 面板是高度受限的 flex 容器，
              卡片一被壓扁就會把欄位整排推到面板外面去。
            */
            "flex-col flex-nowrap items-stretch gap-4 rounded-2xl p-4 transition-colors duration-100",
            // 選取態一律走 --ring：全站唯一用彩色的地方，跟預覽欄的選中框是同一個訊號
            activeId === slide.id && "border-ring/60 bg-ring/[0.04]",
          )}
        >
          <ItemHeader className="gap-2">
            <ItemTitle className="gap-2 font-normal">
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-medium">{KIND_LABEL[slide.kind]}</span>
              {slide.kind === "content" && slide.badge && (
                <Badge variant="secondary" className="font-mono tabular-nums">
                  {slide.badge}
                </Badge>
              )}
            </ItemTitle>
            <SlideActions ops={ops} slide={slide} index={index} count={slides.length} />
          </ItemHeader>

          <FieldGroup className="gap-3">
            {slide.kind === "cover" && (
              <>
                <Field>
                  <FieldLabel htmlFor={`${slide.id}-title`}>封面大標</FieldLabel>
                  <Textarea
                    id={`${slide.id}-title`}
                    value={slide.title}
                    onChange={(event) => patch(slide.id, { title: event.target.value })}
                  />
                </Field>
              </>
            )}

            {slide.kind === "content" && (
              <>
                <div className="grid grid-cols-[88px_1fr] gap-3">
                  <Field>
                    <FieldLabel htmlFor={`${slide.id}-badge`}>頁碼</FieldLabel>
                    <Input
                      id={`${slide.id}-badge`}
                      className="font-mono tabular-nums"
                      value={slide.badge}
                      onChange={(event) => patch(slide.id, { badge: event.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${slide.id}-heading`}>標題</FieldLabel>
                    <Input
                      id={`${slide.id}-heading`}
                      value={slide.heading}
                      onChange={(event) => patch(slide.id, { heading: event.target.value })}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor={`${slide.id}-body`}>內文</FieldLabel>
                  <Textarea
                    id={`${slide.id}-body`}
                    value={slide.body}
                    onChange={(event) => patch(slide.id, { body: event.target.value })}
                  />
                </Field>
              </>
            )}

            {slide.kind === "cta" && (
              <>
                <Field>
                  <FieldLabel htmlFor={`${slide.id}-subhead`}>小標</FieldLabel>
                  <Input
                    id={`${slide.id}-subhead`}
                    value={slide.subhead}
                    onChange={(event) => patch(slide.id, { subhead: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${slide.id}-headline`}>大標</FieldLabel>
                  <Input
                    id={`${slide.id}-headline`}
                    value={slide.headline}
                    onChange={(event) => patch(slide.id, { headline: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldTitle>互動數字（讚 / 留言 / 分享 / 收藏）</FieldTitle>
                  <div className="grid grid-cols-4 gap-2">
                    {slide.stats.map((stat, i) => (
                      <Input
                        key={i}
                        className="font-mono tabular-nums"
                        aria-label={`互動數字 ${i + 1}`}
                        value={stat}
                        onChange={(event) => {
                          const stats = [...slide.stats] as typeof slide.stats;
                          stats[i] = event.target.value;
                          patch(slide.id, { stats });
                        }}
                      />
                    ))}
                  </div>
                </Field>
              </>
            )}
            <ImagePicker
              postId={postId}
              value={slide.imageUrl}
              onChange={(imageUrl) => patch(slide.id, { imageUrl })}
            />
          </FieldGroup>
        </Item>
      ))}

      <AddSlideButtons slides={slides} onChange={onChange} />
    </div>
  );
}
