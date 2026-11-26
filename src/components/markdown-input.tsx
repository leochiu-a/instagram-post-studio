"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownKeymap, markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { type Command, EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * 版型認得的行內標記（見 rich-text.tsx）。它們互斥 —— 一段字要嘛粗體、要嘛
 * 斜體、要嘛程式碼，`***又粗又斜***` 在版型上會原封不動印出星號。所以切換的
 * 時候是「換掉」而不是「疊上去」。
 */
const MARKERS = ["**", "*", "`"] as const;

/** 游標左右各有幾個連續的 marker 字元（最多兩個，`**` 就是上限） */
function wrapperAround(doc: EditorState["doc"], from: number, to: number) {
  for (const marker of MARKERS) {
    const start = from - marker.length;
    if (start < 0 || to + marker.length > doc.length) continue;
    if (
      doc.sliceString(start, from) === marker &&
      doc.sliceString(to, to + marker.length) === marker
    ) {
      return marker;
    }
  }
  return null;
}

/**
 * Cmd+B / Cmd+I / Cmd+E。選取範圍已經是同一種標記就解除，是別種標記就換掉，
 * 沒有標記就包起來；沒選字的話就插入一對標記並把游標放中間。
 */
function toggleMarker(marker: string): Command {
  return (view) => {
    view.dispatch(
      view.state.changeByRange((range) => {
        const { from, to } = range;
        const current = wrapperAround(view.state.doc, from, to);

        if (current === marker) {
          return {
            changes: [
              { from: from - marker.length, to: from },
              { from: to, to: to + marker.length },
            ],
            range: EditorSelection.range(from - marker.length, to - marker.length),
          };
        }

        if (current) {
          return {
            changes: [
              { from: from - current.length, to: from, insert: marker },
              { from: to, to: to + current.length, insert: marker },
            ],
            range: EditorSelection.range(
              from - current.length + marker.length,
              to - current.length + marker.length,
            ),
          };
        }

        return {
          changes: [
            { from, insert: marker },
            { from: to, insert: marker },
          ],
          range: EditorSelection.range(from + marker.length, to + marker.length),
        };
      }),
      { scrollIntoView: true, userEvent: "input" },
    );
    return true;
  };
}

/**
 * 只標出版型真的畫得出來的東西：標題（切頁的界線）、粗體、斜體、程式碼、
 * 列點符號、圖片。其他 Markdown 語法在這裡沒有意義，不給顏色反而誠實。
 */
const highlight = HighlightStyle.define([
  { tag: tags.heading1, class: "cm-md-heading cm-md-h1" },
  { tag: tags.heading2, class: "cm-md-heading" },
  { tag: tags.strong, class: "cm-md-strong" },
  { tag: tags.emphasis, class: "cm-md-emphasis" },
  { tag: tags.monospace, class: "cm-md-code" },
  { tag: tags.list, class: "cm-md-list" },
  { tag: tags.url, class: "cm-md-url" },
  { tag: tags.processingInstruction, class: "cm-md-mark" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "0.875rem", color: "var(--color-foreground)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
    lineHeight: "1.7",
  },
  ".cm-content": { padding: "0.625rem 0.875rem", caretColor: "var(--color-foreground)" },
  ".cm-line": { padding: "0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-foreground)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in oklab, var(--color-ring) 25%, transparent)",
  },
  ".cm-placeholder": { color: "var(--color-muted-foreground)" },
  // 標記符號本身（## 、** 、`）壓灰：它們是語法，不是內容
  ".cm-md-mark": { color: "var(--color-muted-foreground)", opacity: "0.6" },
  ".cm-md-heading": { fontWeight: "700" },
  ".cm-md-h1": { fontSize: "1.05em" },
  ".cm-md-strong": { fontWeight: "700" },
  ".cm-md-emphasis": { fontStyle: "italic" },
  ".cm-md-code": {
    color: "var(--color-primary)",
    background: "color-mix(in oklab, var(--color-primary) 8%, transparent)",
    borderRadius: "0.25rem",
  },
  ".cm-md-list": { color: "var(--color-muted-foreground)" },
  ".cm-md-url": { color: "var(--color-muted-foreground)" },
});

const extensions: Extension[] = [
  history(),
  // markdownKeymap 在前面：Enter 要先讓它接手，才會自動延續 "- " 列點
  keymap.of([
    { key: "Mod-b", run: toggleMarker("**") },
    { key: "Mod-i", run: toggleMarker("*") },
    { key: "Mod-e", run: toggleMarker("`") },
    ...markdownKeymap,
    ...historyKeymap,
    ...defaultKeymap,
  ]),
  markdown({ base: markdownLanguage }),
  syntaxHighlighting(highlight),
  EditorView.lineWrapping,
  theme,
];

interface MarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  /** 游標（選取範圍的 head）移動時回報當下的文件與游標位置 */
  onCursor?: (doc: string, offset: number) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownInput({
  value,
  onChange,
  onCursor,
  placeholder,
  className,
}: MarkdownInputProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  /** onChange 每次 render 都是新的函式，但編輯器只建一次，所以透過 ref 取用最新的 */
  const emit = useRef(onChange);
  const emitCursor = useRef(onCursor);
  useEffect(() => {
    emit.current = onChange;
    emitCursor.current = onCursor;
  });
  /** 建立時的內容。之後的同步走下面那個 effect，這裡只要一個起點 */
  const initial = useRef(value);

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial.current,
        extensions: [
          ...extensions,
          ...(placeholder ? [cmPlaceholder(placeholder)] : []),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) emit.current(update.state.doc.toString());
            // 只在編輯器有焦點時回報：外面（逐頁）整份換掉文件那次不算使用者移動游標
            if (update.selectionSet && update.view.hasFocus) {
              emitCursor.current?.(update.state.doc.toString(), update.state.selection.main.head);
            }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // 編輯器只建一次：內容的同步交給下面那個 effect
  }, [placeholder]);

  /**
   * 外面改了草稿（逐頁編輯會把頁面重新序列化回來）就換掉整份文件。
   * 先比對過再 dispatch —— 自己打字造成的回流也會經過這裡，無條件覆寫
   * 等於每打一個字都把游標踢到最後。
   */
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);

  return (
    <div
      ref={host}
      className={cn(
        "bg-muted focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 min-h-0 overflow-hidden rounded-2xl border border-transparent transition-colors focus-within:ring-3",
        className,
      )}
    />
  );
}
