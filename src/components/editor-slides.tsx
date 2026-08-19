"use client";

import { ImagePicker } from "./image-picker";
import { Button, Field, TextArea, TextInput } from "./ui";
import { makeCtaSlide } from "@/lib/markdown";
import { newId, type ImageShape, type Slide } from "@/lib/types";

const KIND_LABEL: Record<Slide["kind"], string> = {
  cover: "封面",
  content: "內頁",
  cta: "結尾 CTA",
};

const SHAPES: { value: ImageShape; label: string }[] = [
  { value: "banner", label: "橫幅" },
  { value: "square", label: "正方形" },
  { value: "none", label: "不放圖" },
];

function ShapeField({
  value,
  onChange,
}: {
  value: ImageShape;
  onChange: (shape: ImageShape) => void;
}) {
  return (
    <Field label="圖片版位">
      <div className="flex gap-2">
        {SHAPES.map((shape) => (
          <Button
            key={shape.value}
            onClick={() => onChange(shape.value)}
            className={value === shape.value ? "ring-sky-500" : ""}
          >
            {shape.label}
          </Button>
        ))}
      </div>
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
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      {slides.map((slide, index) => (
        <section
          key={slide.id}
          onFocus={() => onFocus(slide.id)}
          className={`rounded-xl bg-neutral-900/60 p-3 ring-1 transition ${
            activeId === slide.id ? "ring-sky-500/60" : "ring-white/10"
          }`}
        >
          <header className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-neutral-300">
              {index + 1}. {KIND_LABEL[slide.kind]}
              {slide.kind === "content" && slide.badge ? ` · ${slide.badge}` : ""}
            </span>
            <div className="flex gap-1">
              <Button onClick={() => move(index, -1)} disabled={index === 0} aria-label="上移">
                ↑
              </Button>
              <Button
                onClick={() => move(index, 1)}
                disabled={index === slides.length - 1}
                aria-label="下移"
              >
                ↓
              </Button>
              <Button onClick={() => addContent(index)}>＋內頁</Button>
              <Button variant="danger" onClick={() => remove(slide.id)}>
                刪除
              </Button>
            </div>
          </header>

          <div className="flex flex-col gap-3">
            {slide.kind === "cover" && (
              <>
                <Field label="封面大標">
                  <TextArea
                    rows={3}
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
                <div className="grid grid-cols-[88px_1fr] gap-2">
                  <Field label="頁碼">
                    <TextInput
                      value={slide.badge}
                      onChange={(event) => patch(slide.id, { badge: event.target.value })}
                    />
                  </Field>
                  <Field label="標題">
                    <TextInput
                      value={slide.heading}
                      onChange={(event) => patch(slide.id, { heading: event.target.value })}
                    />
                  </Field>
                </div>
                <Field label="內文">
                  <TextArea
                    rows={8}
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
                <Field label="小標">
                  <TextInput
                    value={slide.subhead}
                    onChange={(event) => patch(slide.id, { subhead: event.target.value })}
                  />
                </Field>
                <Field label="大標">
                  <TextInput
                    value={slide.headline}
                    onChange={(event) => patch(slide.id, { headline: event.target.value })}
                  />
                </Field>
                <ImagePicker
                  value={slide.imageUrl}
                  onChange={(imageUrl) => patch(slide.id, { imageUrl })}
                />
                <Field label="互動數字（讚 / 留言 / 分享 / 收藏）">
                  <div className="grid grid-cols-4 gap-2">
                    {slide.stats.map((stat, i) => (
                      <TextInput
                        key={i}
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
          </div>
        </section>
      ))}

      <div className="flex gap-2 pb-2">
        <Button onClick={() => addContent(slides.length - 1)}>＋ 新增內頁</Button>
        {!hasCta && (
          <Button onClick={() => onChange([...slides, makeCtaSlide()])}>＋ 結尾 CTA</Button>
        )}
      </div>
    </div>
  );
}
