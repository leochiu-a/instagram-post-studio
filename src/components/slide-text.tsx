"use client";

import { useRef, useState } from "react";

/** 高度跟著內容長，不出現捲軸 —— 外層版位自己會裁，跟顯示時的行為一致 */
function fitHeight(node: HTMLTextAreaElement | null) {
  if (!node) return;
  node.style.height = "auto";
  node.style.height = `${node.scrollHeight}px`;
}

interface SlideTextProps {
  value: string;
  /** 沒給就只是純顯示 —— 縮圖列與匯出用的那份不能被點進去改 */
  onChange?: (value: string) => void;
  /** 內文可以換行；標題類的欄位按 Enter 就是「改好了」 */
  multiline?: boolean;
  /** 平常的樣子（例如 RichText 排好的粗體與程式碼 chip） */
  children: React.ReactNode;
}

/**
 * 畫布上點了就能改的一段字，跟 Canva、Figma 的文字框一樣。
 *
 * 編輯時換成同字級、同行高的 textarea，顯示的是原始文字 —— 粗體的 ** 與
 * 程式碼的反引號會露出來，跟 Obsidian 的 live preview 一樣：游標在哪，
 * 標記就在哪現形，改完離開才排回成品的樣子。用 contentEditable 直接改排好的
 * DOM 的話，這些標記沒地方放，存回 Markdown 會掉格式。
 */
export function SlideText({ value, onChange, multiline = false, children }: SlideTextProps) {
  /*
    框只圈住字本身。單行的欄位（例如內頁標題）外層是整條滿寬、靠右對齊的，
    撐滿的話框會連同左邊的頁碼一起圈進去 —— 所以單行是 inline-block、
    編輯時用 field-sizing 跟著字長；內文這種多行的才佔滿整個版位。
  */
  const box = multiline
    ? ({ display: "block", width: "100%" } as const)
    : ({ display: "inline-block", maxWidth: "100%", verticalAlign: "top" } as const);

  const [editing, setEditing] = useState(false);
  const original = useRef(value);

  if (!onChange) return <>{children}</>;

  const start = () => {
    original.current = value;
    setEditing(true);
  };

  if (!editing) {
    return (
      <button
        type="button"
        title="點一下直接改字"
        className="slide-text"
        onClick={start}
        style={{
          ...box,
          padding: 0,
          border: 0,
          background: "transparent",
          font: "inherit",
          letterSpacing: "inherit",
          color: "inherit",
          textAlign: "inherit",
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <textarea
      ref={fitHeight}
      className="slide-text"
      data-editing
      // oxlint-disable-next-line jsx-a11y/no-autofocus -- 點下去就是要開始打字
      autoFocus
      value={value}
      rows={1}
      spellCheck={false}
      onFocus={(event) => {
        const end = event.currentTarget.value.length;
        event.currentTarget.setSelectionRange(end, end);
      }}
      onChange={(event) => {
        fitHeight(event.currentTarget);
        onChange(multiline ? event.target.value : event.target.value.replace(/\n/g, ""));
      }}
      onBlur={() => setEditing(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onChange(original.current);
          setEditing(false);
        } else if (event.key === "Enter" && !multiline && !event.nativeEvent.isComposing) {
          event.preventDefault();
          setEditing(false);
        }
      }}
      style={{
        ...box,
        fieldSizing: multiline ? undefined : "content",
        padding: 0,
        margin: 0,
        border: 0,
        resize: "none",
        overflow: "hidden",
        background: "transparent",
        font: "inherit",
        letterSpacing: "inherit",
        lineHeight: "inherit",
        color: "inherit",
        textAlign: "inherit",
      }}
    />
  );
}
