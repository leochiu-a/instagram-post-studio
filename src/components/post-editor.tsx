"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EditorMarkdown } from "@/components/editor-markdown";
import { EditorSlides } from "@/components/editor-slides";
import { PreviewList } from "@/components/preview-list";
import { Button, Field, TextInput } from "@/components/ui";
import { downloadAllAsZip, downloadSlide, safeFileName } from "@/lib/export";
import { parseMarkdown, toMarkdown } from "@/lib/markdown";
import { useHydrated, usePost } from "@/lib/post-store";
import type { Slide, ThemeName } from "@/lib/types";

type Tab = "markdown" | "slides";

export function PostEditor({ postId }: { postId: string }) {
  const { post, update, setSlides } = usePost(postId);
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("markdown");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const baseName = useMemo(() => safeFileName(post?.title ?? "ig-post"), [post?.title]);

  const exportOne = async (slide: Slide, index: number) => {
    const node = document.querySelector<HTMLElement>(`[data-slide-id="${slide.id}"]`);
    if (!node) return;
    setStatus("匯出中…");
    try {
      await downloadSlide(node, `${baseName}-${String(index + 1).padStart(2, "0")}.png`);
      setStatus("已下載");
    } catch (error) {
      setStatus(`匯出失敗：${(error as Error).message}`);
    }
  };

  const exportAll = async () => {
    if (!post) return;
    const nodes = post.slides
      .map((slide) => document.querySelector<HTMLElement>(`[data-slide-id="${slide.id}"]`))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;
    setStatus("匯出中…");
    try {
      await downloadAllAsZip(nodes, baseName, (done, total) =>
        setStatus(`匯出中… ${done}/${total}`),
      );
      setStatus(`已下載 ${nodes.length} 張`);
    } catch (error) {
      setStatus(`匯出失敗：${(error as Error).message}`);
    }
  };

  if (!post) {
    // 還沒還原 localStorage 之前不能斷定貼文不存在，先什麼都不畫
    if (!hydrated) return null;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-neutral-400">找不到這篇貼文，可能已經被刪掉了。</p>
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300">
          ← 回貼文清單
        </Link>
      </main>
    );
  }

  const draft = post.draft;

  return (
    <main className="flex min-h-0 flex-1 flex-col lg:h-screen lg:flex-row">
      <aside className="flex w-full flex-col gap-4 border-b border-white/10 p-5 lg:h-screen lg:w-[440px] lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-200">
            ← 貼文清單
          </Link>
          <Field label="貼文名稱">
            <TextInput
              value={post.title}
              onChange={(event) => update({ title: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="帳號">
            <TextInput
              value={post.handle}
              onChange={(event) => update({ handle: event.target.value })}
            />
          </Field>
          <Field label="時間">
            <TextInput
              value={post.timestamp}
              onChange={(event) => update({ timestamp: event.target.value })}
            />
          </Field>
        </div>

        <Field label="配色">
          <div className="flex gap-2">
            {(["dark", "light"] as ThemeName[]).map((theme) => (
              <Button
                key={theme}
                onClick={() => update({ theme })}
                className={post.theme === theme ? "ring-sky-500" : ""}
              >
                {theme === "dark" ? "深色" : "淺色"}
              </Button>
            ))}
          </div>
        </Field>

        <div className="flex gap-1 rounded-lg bg-neutral-900 p-1 ring-1 ring-white/10">
          {(
            [
              ["markdown", "Markdown"],
              ["slides", `逐頁（${post.slides.length}）`],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${
                tab === value ? "bg-white/10 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "markdown" ? (
          <EditorMarkdown
            value={draft}
            onChange={(value) => update({ draft: value })}
            onApply={() => {
              setSlides(parseMarkdown(draft));
              setTab("slides");
            }}
            onPullFromSlides={() => update({ draft: toMarkdown(post.slides) })}
          />
        ) : (
          <EditorSlides
            slides={post.slides}
            onChange={setSlides}
            activeId={activeId}
            onFocus={setActiveId}
          />
        )}

        <div className="flex items-center gap-3 border-t border-white/10 pt-3">
          <Button variant="primary" onClick={() => void exportAll()}>
            匯出全部（ZIP）
          </Button>
          <span className="text-xs text-neutral-400">{status}</span>
        </div>
      </aside>

      <section className="min-h-0 flex-1 overflow-y-auto bg-neutral-900/40 p-6">
        <PreviewList
          slides={post.slides}
          handle={post.handle}
          timestamp={post.timestamp}
          theme={post.theme}
          activeId={activeId}
          onSelect={setActiveId}
          onDownload={(slide, index) => void exportOne(slide, index)}
        />
      </section>
    </main>
  );
}
