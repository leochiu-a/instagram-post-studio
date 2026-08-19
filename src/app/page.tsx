"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorMarkdown } from "@/components/editor-markdown";
import { EditorSlides } from "@/components/editor-slides";
import { PreviewList } from "@/components/preview-list";
import { Button, Field, TextInput } from "@/components/ui";
import { downloadAllAsZip, downloadSlide, safeFileName } from "@/lib/export";
import { parseMarkdown, renumber, SAMPLE, toMarkdown } from "@/lib/markdown";
import type { Post, Slide, ThemeName } from "@/lib/types";

const STORAGE_KEY = "ig-post-studio:v1";

const INITIAL: Post = {
  handle: "@leo.web.dev",
  timestamp: "3 min ago",
  theme: "dark",
  slides: parseMarkdown(SAMPLE),
};

type Tab = "markdown" | "slides";

export default function StudioPage() {
  const [post, setPost] = useState<Post>(INITIAL);
  const [draft, setDraft] = useState(SAMPLE);
  const [tab, setTab] = useState<Tab>("markdown");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  // 讀回上次的內容。刻意放在 effect 裡，避免伺服器與瀏覽器渲染不一致。
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { post: Post; draft: string };
      // oxlint-disable-next-line react/set-state-in-effect -- localStorage 在 SSR 讀不到，只能掛載後還原
      setPost(parsed.post);
      setDraft(parsed.draft);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ post, draft }));
  }, [post, draft]);

  const setSlides = useCallback((slides: Slide[]) => {
    setPost((prev) => ({ ...prev, slides: renumber(slides) }));
  }, []);

  const nodesInOrder = useCallback(
    () =>
      post.slides
        .map((slide) => document.querySelector<HTMLElement>(`[data-slide-id="${slide.id}"]`))
        .filter((node): node is HTMLElement => node !== null),
    [post.slides],
  );

  const baseName = useMemo(() => {
    const cover = post.slides.find((slide) => slide.kind === "cover");
    return safeFileName(cover?.kind === "cover" ? cover.title : "ig-post");
  }, [post.slides]);

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
    const nodes = nodesInOrder();
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

  return (
    <main className="flex min-h-0 flex-1 flex-col lg:h-screen lg:flex-row">
      <aside className="flex w-full flex-col gap-4 border-b border-white/10 p-5 lg:h-screen lg:w-[440px] lg:border-r lg:border-b-0">
        <div>
          <h1 className="text-lg font-semibold">IG Post Studio</h1>
          <p className="text-xs text-neutral-400">1080×1350 · 深淺兩色版型</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="帳號">
            <TextInput
              value={post.handle}
              onChange={(event) => setPost({ ...post, handle: event.target.value })}
            />
          </Field>
          <Field label="時間">
            <TextInput
              value={post.timestamp}
              onChange={(event) => setPost({ ...post, timestamp: event.target.value })}
            />
          </Field>
        </div>

        <Field label="配色">
          <div className="flex gap-2">
            {(["dark", "light"] as ThemeName[]).map((theme) => (
              <Button
                key={theme}
                onClick={() => setPost({ ...post, theme })}
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
            onChange={setDraft}
            onApply={() => {
              setSlides(parseMarkdown(draft));
              setTab("slides");
            }}
            onPullFromSlides={() => setDraft(toMarkdown(post.slides))}
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
