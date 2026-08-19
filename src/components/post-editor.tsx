"use client";

import { FileArchiveIcon, MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EditorMarkdown } from "@/components/editor-markdown";
import { EditorSlides } from "@/components/editor-slides";
import { PreviewList } from "@/components/preview-list";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { downloadAllAsZip, downloadSlide, safeFileName } from "@/lib/export";
import { parseMarkdown, toMarkdown } from "@/lib/markdown";
import { useHydrated, usePost } from "@/lib/post-store";
import type { Slide, ThemeName } from "@/lib/types";

const THEMES: { value: ThemeName; label: string; icon: typeof MoonIcon }[] = [
  { value: "dark", label: "深色", icon: MoonIcon },
  { value: "light", label: "淺色", icon: SunIcon },
];

export function PostEditor({ postId }: { postId: string }) {
  const { post, update, setSlides } = usePost(postId);
  const hydrated = useHydrated();
  const [tab, setTab] = useState("markdown");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const baseName = useMemo(() => safeFileName(post?.title ?? "ig-post"), [post?.title]);

  const exportOne = async (slide: Slide, index: number) => {
    const node = document.querySelector<HTMLElement>(`[data-slide-id="${slide.id}"]`);
    if (!node) return;
    const fileName = `${baseName}-${String(index + 1).padStart(2, "0")}.png`;
    try {
      await downloadSlide(node, fileName);
      toast.success("已下載", { description: fileName });
    } catch (error) {
      toast.error("匯出失敗", { description: (error as Error).message });
    }
  };

  const exportAll = async () => {
    if (!post) return;
    const nodes = post.slides
      .map((slide) => document.querySelector<HTMLElement>(`[data-slide-id="${slide.id}"]`))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    setExporting(true);
    const id = toast.loading(`匯出中… 0/${nodes.length}`);
    try {
      await downloadAllAsZip(nodes, baseName, (done, total) =>
        toast.loading(`匯出中… ${done}/${total}`, { id }),
      );
      toast.success(`已下載 ${nodes.length} 張`, { id, description: `${baseName}.zip` });
    } catch (error) {
      toast.error("匯出失敗", { id, description: (error as Error).message });
    } finally {
      setExporting(false);
    }
  };

  if (!post) {
    // 還沒還原 localStorage 之前不能斷定貼文不存在，先什麼都不畫
    if (!hydrated) return null;
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle>找不到這篇貼文</EmptyTitle>
          <EmptyDescription>可能已經被刪掉了。</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" render={<Link href="/" />}>
          ← 貼文清單
        </Button>
      </Empty>
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
      <header className="border-border flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm whitespace-nowrap transition-colors duration-100 outline-none focus-visible:ring-3"
        >
          ← 貼文清單
        </Link>

        <Separator orientation="vertical" className="hidden h-5 sm:block" />

        <Input
          aria-label="貼文名稱"
          value={post.title}
          onChange={(event) => update({ title: event.target.value })}
          className="h-8 min-w-40 flex-1 border-transparent bg-transparent px-2 font-medium shadow-none dark:bg-transparent"
        />

        <span className="text-muted-foreground hidden font-mono text-[0.7rem] tracking-wider tabular-nums md:inline">
          1080×1350 · {String(post.slides.length).padStart(2, "0")}P
        </span>

        <ToggleGroup
          value={[post.theme]}
          onValueChange={([next]) => next && update({ theme: next as ThemeName })}
          variant="outline"
          size="sm"
          spacing={0}
        >
          {THEMES.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} aria-label={label}>
              <Icon data-icon="inline-start" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Button size="sm" disabled={exporting} onClick={() => void exportAll()}>
          {exporting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <FileArchiveIcon data-icon="inline-start" />
          )}
          匯出全部（ZIP）
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 左欄自己滾動。min-w-0 是必要的：flex item 預設寬度是 min-content，
            編輯器裡的長文字會把這一欄推得比一半還寬。 */}
        <div className="flex min-w-0 flex-col gap-5 p-4 lg:w-1/2 lg:overflow-y-auto">
          <FieldGroup className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="post-handle">帳號</FieldLabel>
              <Input
                id="post-handle"
                value={post.handle}
                onChange={(event) => update({ handle: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="post-timestamp">時間</FieldLabel>
              <Input
                id="post-timestamp"
                value={post.timestamp}
                onChange={(event) => update({ timestamp: event.target.value })}
              />
            </Field>
          </FieldGroup>

          <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
              <TabsTrigger value="slides">
                逐頁
                <span className="font-mono text-xs tabular-nums opacity-60">
                  {String(post.slides.length).padStart(2, "0")}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="markdown">
              <EditorMarkdown
                value={draft}
                onChange={(value) => update({ draft: value })}
                onApply={() => {
                  setSlides(parseMarkdown(draft));
                  setTab("slides");
                }}
                onPullFromSlides={() => update({ draft: toMarkdown(post.slides) })}
              />
            </TabsContent>

            <TabsContent value="slides">
              <EditorSlides
                slides={post.slides}
                onChange={setSlides}
                activeId={activeId}
                onFocus={setActiveId}
              />
            </TabsContent>
          </Tabs>
        </div>

        <section className="bench border-border min-w-0 lg:w-1/2 lg:overflow-y-auto lg:border-l">
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
