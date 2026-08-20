"use client";

import {
  BanIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  RectangleHorizontalIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { ImagePicker } from "./image-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemHeader, ItemTitle } from "@/components/ui/item";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { makeCtaSlide } from "@/lib/markdown";
import { KIND_LABEL, newId, type ImageShape, type Slide } from "@/lib/types";

const SHAPES: { value: ImageShape; label: string; icon: typeof SquareIcon }[] = [
  { value: "banner", label: "橫幅", icon: RectangleHorizontalIcon },
  { value: "square", label: "正方形", icon: SquareIcon },
  { value: "none", label: "不放圖", icon: BanIcon },
];

function ShapeField({
  value,
  onChange,
}: {
  value: ImageShape;
  onChange: (shape: ImageShape) => void;
}) {
  return (
    <Field>
      <FieldTitle>圖片版位</FieldTitle>
      <ToggleGroup
        value={[value]}
        onValueChange={([next]) => next && onChange(next as ImageShape)}
        variant="default"
      >
        {SHAPES.map(({ value: shape, label, icon: Icon }) => (
          <ToggleGroupItem key={shape} value={shape} aria-label={label}>
            <Icon data-icon="inline-start" />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

interface EditorSlidesProps {
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
  activeId: string | null;
  onFocus: (id: string) => void;
}

export function EditorSlides({ slides, onChange, activeId, onFocus }: EditorSlidesProps) {
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
      imageShape: "banner",
    });
    onChange(next);
  };

  const hasCta = slides.some((slide) => slide.kind === "cta");

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
            <ItemActions className="gap-1">
              <ButtonGroup>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="上移"
                >
                  <ChevronUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, 1)}
                  disabled={index === slides.length - 1}
                  aria-label="下移"
                >
                  <ChevronDownIcon />
                </Button>
              </ButtonGroup>
              <Button variant="ghost" size="xs" onClick={() => addContent(index)}>
                <PlusIcon data-icon="inline-start" />
                內頁
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="刪除這一頁"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(slide.id)}
              >
                <Trash2Icon />
              </Button>
            </ItemActions>
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
                <ShapeField
                  value={slide.imageShape}
                  onChange={(imageShape) => patch(slide.id, { imageShape })}
                />
                <ImagePicker
                  value={slide.imageUrl}
                  onChange={(imageUrl) => patch(slide.id, { imageUrl })}
                />
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
                <ShapeField
                  value={slide.imageShape}
                  onChange={(imageShape) => patch(slide.id, { imageShape })}
                />
                <ImagePicker
                  value={slide.imageUrl}
                  onChange={(imageUrl) => patch(slide.id, { imageUrl })}
                />
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
                <ImagePicker
                  value={slide.imageUrl}
                  onChange={(imageUrl) => patch(slide.id, { imageUrl })}
                />
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
          </FieldGroup>
        </Item>
      ))}

      <div className="flex gap-2 pb-2">
        <Button variant="secondary" size="sm" onClick={() => addContent(slides.length - 1)}>
          <PlusIcon data-icon="inline-start" />
          新增內頁
        </Button>
        {!hasCta && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange([...slides, makeCtaSlide()])}
          >
            <PlusIcon data-icon="inline-start" />
            結尾 CTA
          </Button>
        )}
      </div>
    </div>
  );
}
