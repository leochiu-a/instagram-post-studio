// oxlint-disable react/no-array-index-key -- 逐行渲染，行的順序就是內容本身，不會重排
import { RichText } from "./rich-text";
import { METRICS, REEL_METRICS, type Palette } from "@/lib/theme";

const { contentLeft, contentWidth } = METRICS;

/**
 * Reels 的大標 + 副標。大標走跟貼文同一套 RichText 標記，`**粗體**` 的顏色看這一幕的語氣：
 * 講問題的幕（對不齊、各自排版）是紅，講解法與結果的幕是萊姆綠。
 */
export function Caption({
  name,
  title,
  sub,
  tone = "ok",
  palette,
}: {
  /** 給時間軸找節點用的名字（data-r） */
  name: string;
  title: string;
  sub?: string;
  tone?: "ok" | "bad";
  palette: Palette;
}) {
  const c = REEL_METRICS.caption;
  return (
    <div
      data-r={name}
      style={{ position: "absolute", top: c.top, left: contentLeft, width: contentWidth }}
    >
      <div
        style={{
          fontSize: c.fontSize,
          lineHeight: c.lineHeight,
          letterSpacing: `${METRICS.coverTitle.letterSpacing}em`,
          fontWeight: 700,
        }}
      >
        <RichText value={title} palette={{ ...palette, accent: `var(--reel-${tone})` }} />
      </div>
      {sub && (
        <div
          style={{
            marginTop: 20,
            fontSize: REEL_METRICS.subcaption.fontSize,
            lineHeight: REEL_METRICS.subcaption.lineHeight,
            color: "var(--reel-muted)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

const TOKEN = {
  selector: { color: "var(--reel-code-selector)" },
  property: { color: "var(--reel-code-property)" },
  value: { color: "var(--reel-code-value)" },
  punct: { color: "var(--reel-code-comment)" },
  comment: { color: "var(--reel-code-comment)", fontStyle: "italic" },
} as const;

function highlightCss(line: string) {
  if (/^\s*\/\*.*\*\/$/.test(line)) return <span style={TOKEN.comment}>{line}</span>;
  const rule = /^(\s*)([.#][\w-]+)(\s*\{)$/.exec(line);
  if (rule) {
    return (
      <>
        {rule[1]}
        <span style={TOKEN.selector}>{rule[2]}</span>
        <span style={TOKEN.punct}>{rule[3]}</span>
      </>
    );
  }
  const decl = /^(\s*)([\w-]+)(:\s*)(.+)(;)$/.exec(line);
  if (decl) {
    return (
      <>
        {decl[1]}
        <span style={TOKEN.property}>{decl[2]}</span>
        <span style={TOKEN.punct}>{decl[3]}</span>
        <span style={TOKEN.value}>{decl[4]}</span>
        <span style={TOKEN.punct}>{decl[5]}</span>
      </>
    );
  }
  return <span style={TOKEN.punct}>{line}</span>;
}

/**
 * 整塊一起出現的程式碼（深色面板 + 語法色）。重點行底下墊一層萊姆綠框，
 * 透明度吃 --hl，讓時間軸決定它什麼時候亮起來。
 */
export function CodeBlock({
  name,
  lines,
  highlight,
}: {
  name: string;
  /** 支援 `.selector {`、`property: value;`、`}` 與整行的 `/* 註解 *\/` */
  lines: string[];
  /** 要高亮的那一行（0 起算）；那一行會標成 data-r={`${name}-hl`} */
  highlight?: number;
}) {
  const c = REEL_METRICS.code;
  return (
    <div
      data-r={name}
      style={{
        position: "absolute",
        top: c.top,
        left: contentLeft,
        width: contentWidth,
        padding: "34px 40px",
        borderRadius: 28,
        background: "var(--reel-code-bg)",
        border: "2px solid var(--reel-code-line)",
        color: "var(--reel-code-text)",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: c.fontSize,
        lineHeight: 1.6,
        whiteSpace: "pre",
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          data-r={i === highlight ? `${name}-hl` : undefined}
          style={{ position: "relative" }}
        >
          {i === highlight && (
            <span
              style={{
                position: "absolute",
                inset: "-2px -18px",
                borderRadius: 10,
                background: "color-mix(in srgb, var(--reel-code-highlight) 16%, transparent)",
                border: "2px solid color-mix(in srgb, var(--reel-code-highlight) 70%, transparent)",
                opacity: "var(--hl, 0)",
              }}
            />
          )}
          <span style={{ position: "relative" }}>{highlightCss(line)}</span>
        </div>
      ))}
    </div>
  );
}
