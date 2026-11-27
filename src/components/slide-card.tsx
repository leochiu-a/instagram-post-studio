// oxlint-disable react/no-array-index-key -- 這裡的 index 對應固定的版型欄位與逐行渲染，順序不會變
import { Bookmark, Comment, CurvedArrow, Heart, Send, SwipeHand } from "./icons";
import { RichText } from "./rich-text";
import { SlideText } from "./slide-text";
import { CANVAS, METRICS, PALETTES, type Palette } from "@/lib/theme";
import type { Slide, ThemeName } from "@/lib/types";

/** 改這一張的某幾個欄位。沒給就是唯讀（縮圖列、匯出） */
type EditSlide<S extends Slide> = ((changes: Partial<S>) => void) | undefined;

const { padding, contentWidth, contentLeft } = METRICS;

/** 內容區底邊，留出 SWIPE 膠囊的空間 */
const CONTENT_BOTTOM = 150;

/** 絕對定位的圖片版位，封面與結尾頁共用 */
function ImageSlot({
  url,
  top,
  left,
  width,
  height,
}: {
  url: string;
  top: number;
  left: number;
  width: number;
  height: number;
}) {
  return (
    <img
      src={url}
      alt=""
      style={{ position: "absolute", top, left, width, height, objectFit: "contain" }}
    />
  );
}

export function Header({
  handle,
  timestamp,
  palette,
}: {
  handle: string;
  timestamp: string;
  palette: Palette;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: METRICS.header.top,
        left: padding,
        width: contentWidth,
        display: "flex",
        justifyContent: "space-between",
        fontSize: METRICS.header.fontSize,
        lineHeight: METRICS.header.lineHeight,
        color: palette.meta,
      }}
    >
      <span>{handle}</span>
      <span>{timestamp}</span>
    </div>
  );
}

/** 右下角刻意超出畫布的膠囊，只露出左上那一角 —— 跟 Canva 原稿一樣。 */
function SwipePill({ palette }: { palette: Palette }) {
  const s = METRICS.swipe;
  return (
    <div
      style={{
        position: "absolute",
        top: s.top,
        left: s.left,
        width: s.width,
        height: s.height,
        borderRadius: s.height / 2,
        background: palette.swipeFill,
        color: palette.swipeText,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: s.labelLeft,
          top: 18,
          fontSize: s.labelFontSize,
          fontWeight: 700,
          letterSpacing: "-0.011em",
          lineHeight: 1.4,
        }}
      >
        SWIPE
      </span>
      <SwipeHand
        style={{
          position: "absolute",
          left: s.iconLeft,
          top: 18,
          width: s.iconSize,
          height: s.iconSize,
          color: palette.swipeText,
        }}
      />
    </div>
  );
}

function CoverBody({
  slide,
  palette,
  onEdit,
}: {
  slide: Extract<Slide, { kind: "cover" }>;
  palette: Palette;
  onEdit: EditSlide<Extract<Slide, { kind: "cover" }>>;
}) {
  const banner = METRICS.image.coverBanner;
  const square = METRICS.image.square;
  return (
    <>
      {slide.imageUrl && slide.imageShape === "banner" && (
        <img
          src={slide.imageUrl}
          alt=""
          style={{
            position: "absolute",
            left: banner.left,
            bottom: CANVAS.height - METRICS.coverTitle.top + METRICS.bodyImageGap,
            width: banner.width,
            height: "auto",
            maxHeight: banner.maxHeight,
            objectFit: "contain",
          }}
        />
      )}
      {slide.imageUrl && slide.imageShape === "square" && (
        <ImageSlot
          url={slide.imageUrl}
          top={square.top}
          left={square.left}
          width={square.size}
          height={square.size}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: METRICS.coverTitle.top,
          left: contentLeft,
          width: contentWidth,
          fontSize: METRICS.coverTitle.fontSize,
          lineHeight: METRICS.coverTitle.lineHeight,
          letterSpacing: `${METRICS.coverTitle.letterSpacing}em`,
          fontWeight: 700,
          color: palette.text,
        }}
      >
        <SlideText
          value={slide.title}
          onChange={onEdit && ((title) => onEdit({ title }))}
          multiline
        >
          <RichText value={slide.title} palette={palette} />
        </SlideText>
      </div>
    </>
  );
}

function ContentBody({
  slide,
  palette,
  onEdit,
}: {
  slide: Extract<Slide, { kind: "content" }>;
  palette: Palette;
  onEdit: EditSlide<Extract<Slide, { kind: "content" }>>;
}) {
  return (
    <>
      {slide.badge && (
        <div
          style={{
            position: "absolute",
            top: METRICS.badge.top,
            left: padding,
            fontSize: METRICS.badge.fontSize,
            lineHeight: METRICS.badge.lineHeight,
            fontWeight: 700,
            color: palette.text,
          }}
        >
          {slide.badge}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: METRICS.badge.top,
          left: padding,
          width: contentWidth,
          textAlign: "right",
          fontSize: METRICS.badge.fontSize,
          lineHeight: METRICS.badge.lineHeight,
          fontWeight: 700,
          color: palette.text,
        }}
      >
        <SlideText value={slide.heading} onChange={onEdit && ((heading) => onEdit({ heading }))}>
          {slide.heading}
        </SlideText>
      </div>
      <ContentArea slide={slide} palette={palette} onEdit={onEdit} />
    </>
  );
}

/**
 * 內文 + 圖片。圖片錨在內容區底部並保有完整版位 —— 原稿也是這樣排的
 * （內文固定高度、圖片緊接在下方）。這樣內文再長也只會壓到自己，
 * 不會把圖片擠成零高度而無聲消失。
 */
function ContentArea({
  slide,
  palette,
  onEdit,
}: {
  slide: Extract<Slide, { kind: "content" }>;
  palette: Palette;
  onEdit: EditSlide<Extract<Slide, { kind: "content" }>>;
}) {
  const hasImage = Boolean(slide.imageUrl) && slide.imageShape !== "none";
  const square = slide.imageShape === "square" ? METRICS.image.square.size : null;
  // 橫幅在內頁是內容區滿寬（比封面的 banner 略窄，內容區本來就窄一點）
  const imageWidth = square ?? contentWidth;
  const imageHeight = square ?? METRICS.image.banner.height;

  return (
    <div
      style={{
        position: "absolute",
        top: METRICS.body.top,
        left: contentLeft,
        width: contentWidth,
        bottom: CONTENT_BOTTOM,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          bottom: hasImage ? imageHeight + METRICS.bodyImageGap : 0,
          overflow: "hidden",
          fontSize: METRICS.body.fontSize,
          lineHeight: METRICS.body.lineHeight,
          letterSpacing: `${METRICS.body.letterSpacing}em`,
          color: palette.text,
        }}
      >
        <SlideText value={slide.body} onChange={onEdit && ((body) => onEdit({ body }))} multiline>
          <RichText value={slide.body} palette={palette} />
        </SlideText>
      </div>
      {hasImage && (
        <img
          src={slide.imageUrl}
          alt=""
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: imageWidth,
            height: imageHeight,
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}

const CTA_ICONS = [Heart, Comment, Send, Bookmark];

export function CtaBody({
  slide,
  palette,
  onEdit,
}: {
  slide: Extract<Slide, { kind: "cta" }>;
  palette: Palette;
  onEdit?: EditSlide<Extract<Slide, { kind: "cta" }>>;
}) {
  const c = METRICS.cta;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: c.subhead.top,
          left: padding,
          width: contentWidth,
          textAlign: "center",
          fontSize: c.subhead.fontSize,
          lineHeight: 1.4,
          fontWeight: 700,
          color: palette.text,
        }}
      >
        <SlideText value={slide.subhead} onChange={onEdit && ((subhead) => onEdit({ subhead }))}>
          {slide.subhead}
        </SlideText>
      </div>
      <div
        style={{
          position: "absolute",
          top: c.headline.top,
          left: c.headline.left,
          width: c.headline.width,
          textAlign: "center",
          fontSize: c.headline.fontSize,
          lineHeight: c.headline.lineHeight,
          letterSpacing: `${c.headline.letterSpacing}em`,
          fontWeight: 700,
          color: palette.text,
        }}
      >
        <SlideText
          value={slide.headline}
          onChange={onEdit && ((headline) => onEdit({ headline }))}
          multiline
        >
          {slide.headline}
        </SlideText>
      </div>

      <CurvedArrow
        style={{
          position: "absolute",
          top: c.arrow.top,
          left: c.arrow.left,
          width: c.arrow.width,
          height: c.arrow.height,
          color: palette.arrow,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: c.pill.top,
          left: c.pill.left,
          width: c.pill.width,
          height: c.pill.height,
          borderRadius: c.pill.height / 2,
          background: palette.ctaPillFill,
        }}
      />
      {CTA_ICONS.map((Glyph, i) => (
        <Glyph
          key={i}
          style={{
            position: "absolute",
            top: c.icons.top,
            left: c.columns[i] - c.icons.size / 2,
            width: c.icons.size,
            height: c.icons.size,
            color: palette.ctaPillText,
          }}
        />
      ))}
      {slide.imageUrl && <ImageSlot url={slide.imageUrl} {...c.image} />}
      {slide.stats.map((stat, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: c.counts.top,
            left: c.columns[i] - 60,
            width: 120,
            textAlign: "center",
            fontSize: c.counts.fontSize,
            lineHeight: 1.4,
            color: palette.ctaPillText,
          }}
        >
          <SlideText
            value={stat}
            onChange={
              onEdit &&
              ((next) =>
                onEdit({
                  stats: slide.stats.map((s, j) => (j === i ? next : s)) as typeof slide.stats,
                }))
            }
          >
            {stat}
          </SlideText>
        </div>
      ))}
    </>
  );
}

interface SlideCardProps {
  slide: Slide;
  handle: string;
  timestamp: string;
  theme: ThemeName;
  /**
   * 縮圖用。匯出是靠 data-slide-id 找節點的（querySelector 只會拿第一個），
   * 同一張同時出現在預覽欄與縮圖列時，不標這個就會匯出到那張幾十 px 的縮圖。
   */
  decorative?: boolean;
  /** 給了就能在畫布上點文字直接改（預覽欄用）。改動是這一張的部分欄位 */
  onEdit?: (changes: Partial<Slide>) => void;
}

/**
 * 一張貼文頁。永遠以 1080×1350 的真實尺寸渲染，
 * 縮放交給外層的 transform 處理，這樣匯出時才會逐 px 對得上 Canva。
 */
export function SlideCard({ slide, handle, timestamp, theme, decorative, onEdit }: SlideCardProps) {
  const palette = PALETTES[theme];
  return (
    <div
      data-slide-id={decorative ? undefined : slide.id}
      style={{
        position: "relative",
        width: CANVAS.width,
        height: CANVAS.height,
        overflow: "hidden",
        background: palette.background,
        color: palette.text,
        // 預覽時外層是 <button>，不重設會繼承到 text-align: center
        textAlign: "left",
        fontFamily: "var(--font-slide)",
        fontWeight: 400,
      }}
    >
      {/* Canva 原稿只有封面與結尾頁有頁首；內頁的同一條線上放的是頁碼與標題 */}
      {slide.kind !== "content" && (
        <Header handle={handle} timestamp={timestamp} palette={palette} />
      )}
      {slide.kind === "cover" && <CoverBody slide={slide} palette={palette} onEdit={onEdit} />}
      {slide.kind === "content" && <ContentBody slide={slide} palette={palette} onEdit={onEdit} />}
      {slide.kind === "cta" && <CtaBody slide={slide} palette={palette} onEdit={onEdit} />}
      {slide.kind !== "cta" && <SwipePill palette={palette} />}
    </div>
  );
}
