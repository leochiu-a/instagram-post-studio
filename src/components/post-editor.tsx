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
    /*
      桌機版是一個固定高度、本身不滾動的外殼：左右兩欄各自 overflow-y-auto，
      才會有兩條互不相干的 scrollbar —— 頁面整體滾動的話，預覽只能用 sticky 撐著，
      拖哪一邊都像是黏在一起。

      h-dvh 而不是 h-screen：手機瀏覽器的 100vh 是「最大」視窗高度，
      網址列收起來前底部會被遮住。窄螢幕就讓它回到一般的直向捲動。
    */
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-5 py-3">
        <Link
          href="/"
          className="text-sm whitespace-nowrap text-neutral-400 hover:text-neutral-200"
        >
          ← 貼文清單
        </Link>
        <TextInput
          aria-label="貼文名稱"
          value={post.title}
          onChange={(event) => update({ title: event.target.value })}
          className="min-w-40 flex-1 font-medium"
        />
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
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => void exportAll()}>
            匯出全部（ZIP）
          </Button>
          <span className="text-xs text-neutral-400">{status}</span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 左欄自己滾動。min-w-0 是必要的：flex item 預設寬度是 min-content，
            編輯器裡的長文字會把這一欄推得比一半還寬。 */}
        <div className="flex min-w-0 flex-col gap-4 p-5 lg:w-1/2 lg:overflow-y-auto">
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
                  tab === value
                    ? "bg-white/10 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
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
        </div>

        <section className="min-w-0 border-white/10 bg-neutral-900/40 lg:w-1/2 lg:overflow-y-auto lg:border-l">
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
    </div>
  );
}
