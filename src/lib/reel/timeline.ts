/**
 * Reels 的關鍵影格時間軸。
 *
 * 每一格畫面都是時間 t 的純函數：seek(t) 直接算出每個元素在那一刻的樣子，
 * 不依賴「上一格」。所以預覽可以隨意拖時間軸，輸出影片時也能逐格截圖、每次結果都一樣。
 * 不用 Web Animations API 是因為同一個元素上排好幾段動畫時，後建立的那段會用
 * backwards fill 蓋掉前一段 —— 淡入淡出排在一起就會出錯。
 */

const EASE = {
  linear: (t: number) => t,
  out: (t: number) => 1 - (1 - t) ** 3,
  in: (t: number) => t ** 3,
  inOut: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

export type Easing = keyof typeof EASE;

export interface Props {
  /** opacity */
  o: number;
  x: number;
  y: number;
  /** scale */
  s: number;
  /** 由左往右揭露的百分比（clip-path），畫線用 */
  cw?: number;
  /** 由上往下揭露的百分比 */
  ch?: number;
  /** 寫進 CSS 變數 --hl，給程式碼高亮行用 */
  hl?: number;
}

type Key = Partial<Props> & { e?: Easing };
type FullKey = Props & { t: number; e: Easing };

const DEFAULTS: Props = { o: 1, x: 0, y: 0, s: 1 };

function sample(keys: FullKey[], t: number): Props {
  if (t <= keys[0].t) return keys[0];
  const last = keys[keys.length - 1];
  if (t >= last.t) return last;
  let i = 1;
  while (keys[i].t < t) i++;
  const a = keys[i - 1];
  const b = keys[i];
  const k = EASE[b.e]((t - a.t) / (b.t - a.t));
  const out = { ...b };
  for (const p of ["o", "x", "y", "s", "cw", "ch", "hl"] as const) {
    const from = a[p];
    const to = b[p];
    if (from !== undefined && to !== undefined) out[p] = from + (to - from) * k;
  }
  return out;
}

function apply(el: HTMLElement, v: Props) {
  el.style.opacity = String(v.o);
  el.style.visibility = v.o <= 0.001 ? "hidden" : "visible";
  el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
  // 起點那一側不外擴：外擴的話 cw = 0 時還會露出一截
  if (v.cw !== undefined) el.style.clipPath = `inset(-20px ${100 - v.cw}% -20px 0)`;
  if (v.ch !== undefined) el.style.clipPath = `inset(0 -20px ${100 - v.ch}% -20px)`;
  if (v.hl !== undefined) el.style.setProperty("--hl", String(v.hl));
}

export interface ShowOptions {
  /** 進場／退場的秒數 */
  d?: number;
  from?: Partial<Props>;
  to?: Partial<Props>;
}

export class Timeline {
  private tracks: { el: HTMLElement; keys: FullKey[] }[] = [];
  private created: HTMLElement[] = [];

  /** 建一個標註用的節點（對齊線、記號…）。dispose 時會一起收掉 */
  create(parent: HTMLElement, className: string, style: Partial<CSSStyleDeclaration>, html = "") {
    const el = document.createElement("div");
    el.className = className;
    Object.assign(el.style, style);
    el.innerHTML = html;
    parent.appendChild(el);
    this.created.push(el);
    return el;
  }

  /**
   * 還原 DOM：移除 create 建的節點、清掉 seek 寫上去的 inline style。
   * React 的 Strict Mode 會把 effect 跑兩次，不清乾淨的話第二次會量到被位移過的元素。
   */
  dispose() {
    for (const el of this.created) el.remove();
    for (const { el } of this.tracks) {
      for (const p of ["opacity", "visibility", "transform", "clipPath"] as const) el.style[p] = "";
      el.style.removeProperty("--hl");
    }
    this.created = [];
    this.tracks = [];
  }

  /**
   * 一串 [秒數, 狀態]，沒寫到的屬性沿用前一格。
   *
   * 一個元素只能有一條 track：兩條疊在一起時，後排的那條在它開始之前也會停在自己的
   * 第一格、蓋掉前一條 —— 本來該 1.6 秒才彈出來的記號，會從第 0 秒就掛在畫面上。
   * 進場、退場、再進場要寫進同一串關鍵影格裡。
   */
  track(el: HTMLElement, keys: [number, Key][]) {
    if (this.tracks.some((t) => t.el === el)) {
      throw new Error(`同一個元素排了兩條 track：${el.dataset.r ?? el.className}`);
    }
    let prev: Props = { ...DEFAULTS };
    const full = keys.map(([t, p]) => {
      const key: FullKey = { ...prev, ...p, t, e: p.e ?? "out" };
      prev = key;
      return key;
    });
    this.tracks.push({ el, keys: full });
  }

  /** 在 tin 進場、tout 退場（null 表示留到最後） */
  show(el: HTMLElement, tin: number, tout: number | null, opts: ShowOptions = {}) {
    const { d = 0.5, from = { o: 0, y: 50 }, to = { o: 0, y: -50 } } = opts;
    const keys: [number, Key][] = [
      [tin, from],
      [tin + d, DEFAULTS],
    ];
    if (tout !== null) keys.push([tout, DEFAULTS], [tout + d, { ...DEFAULTS, ...to, e: "in" }]);
    this.track(el, keys);
  }

  seek(t: number) {
    for (const { el, keys } of this.tracks) apply(el, sample(keys, t));
  }
}
