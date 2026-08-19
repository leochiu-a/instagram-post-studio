interface GlyphProps {
  className?: string;
  style?: React.CSSProperties;
}

/** SWIPE 膠囊右側的滑動手勢 */
export function SwipeHand({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M28 34V16.5a4.5 4.5 0 0 1 9 0V34"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M37 27.5a4.5 4.5 0 0 1 9 0V32m0-1a4.5 4.5 0 0 1 9 0v11c0 8.837-7.163 16-16 16h-6a13 13 0 0 1-11.7-7.33l-6.4-13.2a4.6 4.6 0 0 1 7.9-4.7L28 40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 16a20 20 0 0 1 8-8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Heart({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M12 20.5S3.5 15.2 3.5 9.3A5.3 5.3 0 0 1 12 5.6a5.3 5.3 0 0 1 8.5 3.7c0 5.9-8.5 11.2-8.5 11.2Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Comment({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M21 11.6c0 4.5-4 8.1-9 8.1a10 10 0 0 1-2.8-.4L4 21l1.4-4A7.7 7.7 0 0 1 3 11.6c0-4.5 4-8.1 9-8.1s9 3.6 9 8.1Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Send({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M21.5 3 2.8 9.9a.6.6 0 0 0 0 1.1l7.7 2.7 2.7 7.7a.6.6 0 0 0 1.1 0L21.5 3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21.5 3 10.5 13.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function Bookmark({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M18.5 21 12 16.4 5.5 21V4.6a1.6 1.6 0 0 1 1.6-1.6h9.8a1.6 1.6 0 0 1 1.6 1.6V21Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 結尾頁指向 icon 列的手繪箭頭 */
export function CurvedArrow({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 208 52" className={className} style={style} fill="none" aria-hidden>
      <path
        d="M4 44C34 12 92 2 158 14"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M136 4c10 4 18 7 24 10-7 4-13 9-18 16"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
