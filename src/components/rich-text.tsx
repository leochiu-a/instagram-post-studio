// oxlint-disable react/no-array-index-key -- 這裡的 index 對應固定的版型欄位與逐行渲染，順序不會變
import { CODE_CHIP_RADIUS, type Palette } from "@/lib/theme";

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** 把一行文字裡的 **粗體** 與 `程式碼` 換成對應樣式的 span。 */
function inline(text: string, palette: Palette) {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ fontWeight: 700, color: palette.accent }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        // display: inline 讓 chip 的垂直內距溢出行框，行高與行位不被撐開；
        // 左右各留一點 margin，不然內距會把前後那個空白吃掉，看起來就跟正文黏在一起
        <span
          key={i}
          style={{
            display: "inline",
            margin: "0 0.14em",
            padding: "0.1em 0.22em",
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
