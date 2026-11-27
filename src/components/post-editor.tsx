"use client";

import {
  ArrowLeftIcon,
  FileArchiveIcon,
  FileTextIcon,
  LayersIcon,
  MoonIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EditorMarkdown } from "@/components/editor-markdown";
import { AddSlideButtons, EditorSlides, slideOps } from "@/components/editor-slides";
import { PanelResizer } from "@/components/panel-resizer";
import { PreviewList } from "@/components/preview-list";
import { SlideFilmstrip } from "@/components/slide-filmstrip";
import { SlideToolbar } from "@/components/slide-toolbar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { downloadAllAsZip, downloadSlide, safeFileName } from "@/lib/export";
import { cn } from "@/lib/utils";
import { parseMarkdown, slideIndexAt } from "@/lib/markdown";
import { useHydrated, usePost } from "@/lib/post-store";
import { usePanelWidth } from "@/lib/use-panel-width";
import { KIND_LABEL, type Slide, type ThemeName } from "@/lib/types";

/** 跟 post-store 裡存檔用的同一個節奏，使用者已經習慣這個停頓感 */
const APPLY_DELAY = 600;

const THEMES: { value: ThemeName; label: string; icon: typeof MoonIcon }[] = [
  { value: "dark", label: "深色", icon: MoonIcon },
  { value: "light", label: "淺色", icon: SunIcon },
];

/**
 * 左側 rail 的項目。十個競品全都有這條 rail，寬度 40–72px、點了才展開旁邊的面板；
 * 有沒有它決定了這東西看起來像「編輯器」還是像「一個表單旁邊放了張圖」。
 *
 * Markdown 與逐頁原本是面板裡的 tabs，現在直接升成 rail 項目 ——
 * rail 的職責本來就是「切換你在編哪一種東西」，再包一層 tabs 是多的。
 */
const PANELS = [
  { value: "markdown", label: "Markdown", icon: FileTextIcon },
  { value: "slides", label: "逐頁", icon: LayersIcon },
  { value: "settings", label: "設定", icon: SlidersHorizontalIcon },
] as const;

type PanelName = (typeof PANELS)[number]["value"];

/**
 * 正在用哪個面板跟面板寬度一樣是「我習慣怎麼編」的偏好，不是貼文的屬性 ——
 * 留在 localStorage，重新整理或換一篇貼文都停在同一個面板。
 */
const PANEL_KEY = "ig-post-studio:panel";

function usePanel() {
  const [panel, setPanel] = useState<PanelName>("markdown");

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY);
    const known = PANELS.find(({ value }) => value === stored);
    // oxlint-disable-next-line react/set-state-in-effect -- localStorage 在 SSR 讀不到，只能掛載後才還原
    if (known) setPanel(known.value);
  }, []);

  const choose = (next: PanelName) => {
    setPanel(next);
    localStorage.setItem(PANEL_KEY, next);
  };

  return [panel, choose] as const;
}

/**
 * 編輯欄與預覽是不是左右並排（lg）。窄螢幕是上下堆疊的一條長頁面，
 * 這時候為了「跟著編輯的地方」去捲預覽，等於把正在打字的欄位捲走。
 */
const isSplitLayout = () => window.matchMedia("(min-width: 64rem)").matches;

/**
 * 從縮圖列跳到某一張。捲的是預覽欄裡那張卡片的外框，不是 data-slide-id ——
 * 後者是匯出用的內層節點，捲它會停在錯的位置。
 */
function scrollPreviewIntoView(id: string) {
  const node = document.querySelector(`[data-preview-slide="${id}"]`);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  node?.scrollIntoView({
    block: "center",
    behavior: reduced ? "auto" : "smooth",
  });
}

/** 面板裡的區塊標題。刻意比欄位標籤還輕：它是分區，不是要讀的東西 */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground text-[0.8125rem] font-medium tracking-wide">{children}</h2>
  );
}

export function PostEditor({ postId }: { postId: string }) {
  const { post, update, setSlides } = usePost(postId);
  const hydrated = useHydrated();
  const [panel, setPanel] = usePanel();
  const { width: panelWidth, resize } = usePanelWidth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const applyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseName = useMemo(() => safeFileName(post?.title ?? "ig-post"), [post?.title]);

  /**
   * 打字先只更新草稿本身，讓 Textarea 不卡頓；停下來一段時間後才真的解析
   * 套用到逐頁。套用時不回寫草稿（syncDraft: false）—— 使用者手上那份就是
   * 正本，重新序列化蓋回去會把游標踢到最後，也會改掉他刻意留的空行與符號。
   */
  const editDraft = (value: string) => {
    update({ draft: value });
    if (applyTimer.current) clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(
      () => setSlides(parseMarkdown(value), { syncDraft: false }),
      APPLY_DELAY,
    );
  };

  // 換頁離開或整個編輯器卸載時，還沒套用的解析就放掉——不留著跨貼文亂套。
  useEffect(
    () => () => {
      if (applyTimer.current) clearTimeout(applyTimer.current);
    },
    [],
  );

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
      toast.success(`已下載 ${nodes.length} 張`, {
        id,
        description: `${baseName}.zip`,
      });
    } catch (error) {
      toast.error("匯出失敗", { id, description: (error as Error).message });
    } finally {
      setExporting(false);
    }
  };

  if (!post) {
    // 還沒讀完 content/posts 之前不能斷定貼文不存在，先什麼都不畫
    if (!hydrated) return null;
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle>找不到這篇貼文</EmptyTitle>
          <EmptyDescription>可能已經被刪掉了。</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          ← 貼文清單
        </Button>
      </Empty>
    );
  }

  const draft = post.draft;
  const ops = slideOps(post.slides, setSlides);
  const activeIndex = post.slides.findIndex((slide) => slide.id === activeId);
  const activeSlide = activeIndex === -1 ? null : post.slides[activeIndex];

  return (
    /*
      桌機版是一個固定高度、本身不滾動的外殼：側邊欄與畫布區各自 overflow-y-auto，
      才會有兩條互不相干的 scrollbar —— 頁面整體滾動的話，預覽只能用 sticky 撐著，
      拖哪一邊都像是黏在一起。

      h-dvh 而不是 h-screen：手機瀏覽器的 100vh 是「最大」視窗高度，
      網址列收起來前底部會被遮住。窄螢幕就讓它回到一般的直向捲動。
    */
    <div className="flex flex-col lg:h-dvh lg:overflow-hidden">
      {/*
        頂列三段式：左邊是「我在哪、這是什麼」，右邊是「我要帶走什麼」，中間留白。
        配色切換不在這裡 —— 它改的是版型內容，屬於側邊欄的設定，不是全域動作。
      */}
      <header className="flex h-14 shrink-0 items-center gap-2 px-3">
        {/*
          用原生的 a 而不是 Button render={<Link/>}：base-ui 的 Button 會把
          role 蓋成 button，導覽用的東西就不再被當成連結（新分頁開、朗讀都會走樣）。
          樣式自己補到跟 ghost 按鈕一致就好。
        */}
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-100 outline-none focus-visible:ring-3"
        >
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">貼文清單</span>
        </Link>

        <Separator orientation="vertical" className="hidden h-5 sm:block" />

        <Input
          aria-label="貼文名稱"
          value={post.title}
          onChange={(event) => update({ title: event.target.value })}
          className="hover:border-border h-8 min-w-0 flex-1 border-transparent bg-transparent px-2 font-medium shadow-none sm:max-w-80"
        />

        {/*
          兩層工具列的上層：跟著選取改變的詳細讀數。沒選東西時只報整份貼文的規格，
          選了某一張才展開那一張的頁次與類型 —— Polotno 的頂端屬性列就是這個行為，
          沒選東西時它也只剩 undo/redo。下層是貼在每張預覽上的浮動快捷列。
        */}
        <span className="text-muted-foreground hidden font-mono text-[0.7rem] tracking-wider tabular-nums md:inline">
          {activeSlide
            ? `${String(activeIndex + 1).padStart(2, "0")} / ${String(post.slides.length).padStart(2, "0")} · ${KIND_LABEL[activeSlide.kind]} · 1080×1350`
            : `1080×1350 · ${String(post.slides.length).padStart(2, "0")}P`}
        </span>

        <Separator orientation="vertical" className="hidden h-5 md:block" />

        <Button
          size="sm"
          className="shrink-0"
          disabled={exporting}
          onClick={() => void exportAll()}
        >
          {exporting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <FileArchiveIcon data-icon="inline-start" />
          )}
          匯出全部（ZIP）
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/*
          rail：窄螢幕橫著排在上面，桌機才立成 64px 的直排。
          它只切換「在編哪一種東西」—— 面板不會收起來，要更多畫布空間
          就拖分隔線把它縮窄。
        */}
        <nav aria-label="編輯面板" className="flex shrink-0 gap-2 p-2 lg:w-[84px] lg:flex-col">
          {PANELS.map(({ value, label, icon: Icon }) => {
            const current = panel === value;

            return (
              <button
                key={value}
                type="button"
                aria-controls="editor-panel"
                aria-pressed={current}
                onClick={() => setPanel(value)}
                className={cn(
                  "focus-visible:ring-ring/50 flex flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl px-1.5 py-3.5 text-[0.6875rem] font-medium transition-colors duration-100 outline-none focus-visible:ring-3 lg:flex-none",
                  current
                    ? "bg-canvas text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {/* truncate 是保險絲：rail 是寫死寬度的，標籤再長也只能被截掉，不能撐破 */}
                <span className="w-full truncate text-center">{label}</span>
              </button>
            );
          })}
        </nav>

        {/*
          面板寬度由使用者拖出來（記在 localStorage）。
          relative 是給分隔線定位用的，所以捲動要放在裡面那層 ——
          分隔線掛在會捲的容器上會跟著內容跑掉。
        */}
        <div
          id="editor-panel"
          className={cn(
            "relative flex min-w-0 flex-col lg:w-(--panel-width) lg:shrink-0",
            // 窄螢幕的逐頁不另開一張表單：控制列直接長在每張預覽底下（見 PreviewList），
            // 表單疊在預覽上面的話，改的時候根本看不到那一張
            panel === "slides" && "max-lg:hidden",
          )}
          style={{ ["--panel-width" as string]: `${panelWidth}px` }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 p-5 lg:overflow-y-auto">
            {panel === "settings" && (
              <>
                <PanelLabel>貼文設定</PanelLabel>

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

                <Field>
                  <FieldTitle>配色</FieldTitle>
                  <ToggleGroup
                    value={[post.theme]}
                    onValueChange={([next]) => next && update({ theme: next as ThemeName })}
                    variant="default"
                    className="w-full *:flex-1"
                  >
                    {THEMES.map(({ value, label, icon: Icon }) => (
                      <ToggleGroupItem key={value} value={value} aria-label={label}>
                        <Icon data-icon="inline-start" />
                        {label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              </>
            )}

            {panel === "markdown" && (
              <>
                <PanelLabel>Markdown</PanelLabel>
                <EditorMarkdown
                  value={draft}
                  onChange={editDraft}
                  onCursor={(doc, offset) => {
                    if (!isSplitLayout()) return;
                    // 草稿與頁面順序一致（逐頁那邊也是照這份切），用第幾頁對回去就好。
                    // 剛打出新標題、還沒套用的那幾百毫秒會對不到，就先不動。
                    const index = slideIndexAt(doc, offset);
                    const id = index === null ? undefined : post.slides[index]?.id;
                    if (!id || id === activeId) return;
                    setActiveId(id);
                    scrollPreviewIntoView(id);
                  }}
                />
              </>
            )}

            {panel === "slides" && (
              <>
                <PanelLabel>逐頁 · {String(post.slides.length).padStart(2, "0")}</PanelLabel>
                <EditorSlides
                  postId={postId}
                  slides={post.slides}
                  onChange={setSlides}
                  activeId={activeId}
                  onFocus={(id) => {
                    if (!isSplitLayout()) return;
                    setActiveId(id);
                    scrollPreviewIntoView(id);
                  }}
                />
              </>
            )}
          </div>

          <PanelResizer width={panelWidth} onResize={resize} />
        </div>

        {/*
          畫布欄。抽屜展開時它是這一欄裡真正佔高度的一列，畫布區跟著變矮、
          預覽自己縮小 —— 用 absolute 蓋上去的話會把最底下那張切掉。
        */}
        <div className="flex min-h-0 flex-1 flex-col">
          <section className="bench min-w-0 flex-1 lg:overflow-y-auto lg:rounded-tl-2xl">
            <PreviewList
              slides={post.slides}
              handle={post.handle}
              timestamp={post.timestamp}
              theme={post.theme}
              activeId={activeId}
              onSelect={setActiveId}
              onDownload={(slide, index) => void exportOne(slide, index)}
              onEdit={(id, changes) => ops.patch(id, changes)}
              renderToolbar={(slide, index) => (
                <SlideToolbar
                  ops={ops}
                  slide={slide}
                  index={index}
                  count={post.slides.length}
                  postId={postId}
                />
              )}
              footer={
                panel === "slides" ? (
                  <AddSlideButtons slides={post.slides} onChange={setSlides} />
                ) : undefined
              }
            />
          </section>

          <SlideFilmstrip
            slides={post.slides}
            handle={post.handle}
            timestamp={post.timestamp}
            theme={post.theme}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              scrollPreviewIntoView(id);
            }}
            onReorder={setSlides}
          />
        </div>
      </main>
    </div>
  );
}
