// oxlint-disable react/no-array-index-key -- 這裡的 index 對應固定的版型欄位與逐行渲染，順序不會變
import { CODE_CHIP_BOX, CODE_CHIP_RADIUS, type Palette } from "@/lib/theme";

/**
 * 三種行內標記。**粗體** 一定要排在 *斜體* 前面 —— 交替順序就是比對順序，
 * 反過來的話 `**字**` 會先被斜體那一段吃掉開頭的單顆星號。
 */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

/** 把一行文字裡的 **粗體**、*斜體* 與 `程式碼` 換成對應樣式的 span。 */
function inline(text: string, palette: Palette) {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ fontWeight: 700, color: palette.accent }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      // 斜體只改字形、不改顏色：強調色是粗體的訊號，兩個都上就分不出輕重
      return (
        <span key={i} style={{ fontStyle: "italic" }}>
          {part.slice(1, -1)}
        </span>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        // 盒子的高度自己算（見 CODE_CHIP_BOX）：交給字體的 content area 會讓
        // 連續幾行的 chip 黏成一整片，上下對稱的內距又會切到「p」的下緣。
        // 左右的 margin 是為了不讓內距把前後那個空白吃掉。
        <span
          key={i}
          style={{
            display: "inline-block",
            lineHeight: CODE_CHIP_BOX.lineHeight,
            margin: "0 0.14em",
            padding: CODE_CHIP_BOX.padding,
            borderRadius: CODE_CHIP_RADIUS,
            background: palette.code.fill,
            color: palette.code.text,
          }}
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

interface RichTextProps {
  /** 原始內文。空行會保留成一整行的間距，"- " 開頭的行變成項目符號。 */
  value: string;
  palette: Palette;
}

/**
 * 逐行渲染，而不是靠段落 margin —— Canva 的內文是單一文字框，
 * 空行就是一個 line-height 的高度，這樣排出來的行位才會對得上。
 */
export function RichText({ value, palette }: RichTextProps) {
  return (
    <>
      {value.split("\n").map((line, i) => {
        const bullet = /^[-*]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <div key={i} style={{ display: "flex", gap: "0.5em", paddingLeft: "0.9em" }}>
              <span aria-hidden>•</span>
              <span style={{ flex: 1 }}>{inline(bullet[1], palette)}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i}>&nbsp;</div>;
        return <div key={i}>{inline(line, palette)}</div>;
      })}
    </>
  );
}
