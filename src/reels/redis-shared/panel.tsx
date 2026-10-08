import type { ReactNode } from "react";
import s from "./panel.module.css";
import { RichText } from "@/components/rich-text";
import { CtaBody } from "@/components/slide-card";
import type { Timeline } from "@/lib/reel/timeline";
import { REEL_METRICS, type Palette } from "@/lib/theme";

/**
 * 兩支 Redis reel（redis-lru-lfu、redis-allkeys-volatile）共用的 Redis 面板與時間軸工具。
 *
 * 面板由上到下是：指令列（redis-cli 送進來的指令）、maxmemory-policy、記憶體條、6 個 key。
 * 策略名稱做在面板裡而不是另外放程式碼區塊：放在下面的話，觀眾的眼睛停在 key 上，
 * 根本不會往下看（使用者實際回饋過）。
 */

export type Keys = Parameters<Timeline["track"]>[1];
export type Rect = ReturnType<ReturnType<typeof measurer>>;

export interface RedisKey {
  name: string;
  /** 多久前被存取過（LRU 看這個） */
  recency: string;
  /** 被存取過幾次（LFU 看這個） */
  count?: string;
  /** 剩下多久過期；空字串是沒設 TTL。有這個欄位時格子第三行顯示 TTL，不顯示存取次數 */
  ttl?: string;
}

/** 格子裡哪一行是這個策略在看的：LRU 看「最近」、LFU 看「存取次數」 */
export type KeyFocus = "recency" | "count";

/**
 * 聚焦的單位：每一步只有正在發生事情的那幾塊是亮的，其餘調暗。
 * 沒有聲音的時候，觀眾靠亮暗知道現在要看哪裡（使用者實際回饋過：全部同時亮著就不知道看哪）。
 * maxmemory-policy 那一行是主角，永遠不調暗（使用者回饋過要一直看得到），所以不在這裡。
 * 時間表裡的 [] 表示「只剩策略亮著」，例如策略翻牌的時候
 */
export type Area = "lane" | "bar" | "grid";
export type FocusAt = [number, Area[] | "all"][];
const AREAS: Area[] = ["lane", "bar", "grid"];
const DIM = 0.3;

/** [秒, 策略]：面板上的 maxmemory-policy 在什麼時候換成什麼 */
export type PolicyAt = [number, string][];
const policiesOf = (at: PolicyAt) => [...new Set(at.map(([, p]) => p))];

/* ================= 元件 ================= */

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

/** 同一組 6 個 key。換策略時整份換掉（交叉淡入淡出），不在同一份上切狀態 */
export function KeyGrid({
  name,
  keys,
  focus,
}: {
  name: string;
  keys: RedisKey[];
  focus?: KeyFocus;
}) {
  return (
    <div data-r={name} className={s.grid}>
      {keys.map((key) => (
        <div key={key.name} className={s.key}>
          <div className={s.keyName}>{key.name}</div>
          <div className={cx(s.meta, focus === "recency" && s.focus)}>最近：{key.recency}</div>
          {key.ttl === undefined ? (
            <div className={cx(s.meta, focus === "count" && s.focus)}>存取 {key.count} 次</div>
          ) : (
            // TTL 膠囊與「沒設 TTL」疊在同一格：拿掉 TTL 那一幕把膠囊收掉、文字淡入
            <div className={s.ttlRow}>
              {key.ttl ? (
                <>
                  <span data-r="ttl" className={s.ttl}>
                    {key.ttl}
                  </span>
                  <span data-r="ttlGone" className={s.meta}>
                    沒設 TTL
                  </span>
                </>
              ) : (
                <span className={s.meta}>沒設 TTL</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** 新寫進來的 key（build 建出來、從指令列飛進格子），長得跟 KeyGrid 的格子一樣 */
export function keyBody(key: RedisKey, focus?: KeyFocus) {
  const meta = (text: string, on: boolean) =>
    `<div class="${cx(s.meta, on && s.focus)}">${text}</div>`;
  const third =
    key.ttl === undefined
      ? meta(`存取 ${key.count} 次`, focus === "count")
      : key.ttl
        ? `<div class="${s.ttlRow}"><span class="${s.ttl}">${key.ttl}</span></div>`
        : meta("沒設 TTL", false);
  return `<div class="${s.keyName}">${key.name}</div>${meta(`最近：${key.recency}`, focus === "recency")}${third}`;
}

export interface Command {
  name: string;
  cmd: string;
  /** redis-cli 回的錯誤，例如 (error) OOM command not allowed */
  err?: boolean;
}

/**
 * Redis 面板。grids 放進「key 格子」那一塊聚焦單位；children 是面板座標系裡的其他東西
 * （資料庫、抽樣用的 key 池），疊在 grid 之上、overlay 之下
 */
export function RedisPanel({
  commands,
  policyAt,
  grids,
  children,
}: {
  commands: Command[];
  policyAt: PolicyAt;
  grids: ReactNode;
  children?: ReactNode;
}) {
  // 示範區比範本高（指令列 + 策略 + 記憶體條 + 兩排 key），往上挪一點
  const top = REEL_METRICS.demo.top - 40;
  return (
    <div data-r="demo" className={cx(s.abs, s.demo)} style={{ top }}>
      <div data-r="mem" className={s.mem}>
        <div data-r="lane" className={s.lane}>
          {commands.map((c) => (
            <div key={c.name} data-r={c.name} className={cx(s.pill, c.err && s.err)}>
              {!c.err && <span>&gt;</span>}
              {c.cmd}
            </div>
          ))}
        </div>
        <div className={s.policyRow}>
          maxmemory-policy
          <div className={s.polVals}>
            {policiesOf(policyAt).map((p) => (
              <span key={p} data-r={`pol-${p}`}>
                {p}
              </span>
            ))}
          </div>
        </div>
        <div data-r="bar" className={s.bar}>
          <div className={s.barLabel}>
            <span>
              記憶體 <code>maxmemory 100mb</code>
            </span>
            <span data-r="full" className={s.badge}>
              已滿
            </span>
          </div>
          <div data-r="barTrack" className={s.barTrack}>
            <div data-r="barFill" className={s.barFill} />
            <div data-r="barFull" className={cx(s.barFill, s.full)} />
          </div>
        </div>
      </div>
      <div data-r="grid" className={s.gridArea}>
        {grids}
      </div>
      {children}
      <div data-r="overlay" />
    </div>
  );
}

/** 一次只出現一張的說明卡片，疊在同一個位置；data-r 是 `${name}${i}` */
export function Steps({
  name,
  top,
  items,
  palette,
  numbered = true,
}: {
  name: string;
  top: number;
  items: string[];
  palette: Palette;
  numbered?: boolean;
}) {
  return (
    <div className={cx(s.abs, s.steps)} style={{ top }}>
      {items.map((text, i) => (
        <div key={text} data-r={`${name}${i}`} className={s.chip}>
          {numbered && <b>0{i + 1}</b>}
          <div style={{ flex: 1 }}>
            <RichText value={text} palette={palette} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 一起出現的說明卡片（例如回顧），data-r 是 `${name}${i}` */
export function Chips({
  name,
  top,
  items,
  palette,
}: {
  name: string;
  top: number;
  items: string[];
  palette: Palette;
}) {
  return (
    <div className={cx(s.abs, s.explain)} style={{ top }}>
      {items.map((text, i) => (
        <div key={text} data-r={`${name}${i}`} className={s.chip}>
          <b>0{i + 1}</b>
          <div style={{ flex: 1 }}>
            <RichText value={text} palette={palette} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 結尾：一段設定（程式碼配色）+ 貼文同款的 CTA 頁 */
export function Ending({
  palette,
  config,
  subhead,
}: {
  palette: Palette;
  /** [指令, 值] */
  config: [string, string][];
  subhead: string;
}) {
  return (
    <>
      <div data-r="summary" className={cx(s.abs, s.summary)} style={{ top: 300 }}>
        {config.map(([k, v], i) => (
          <div key={k + v + i}>
            <span>{k}</span> {v}
          </div>
        ))}
      </div>
      {/* 貼文的 CTA 頁，整塊往下平移到 9:16 畫布的中間 */}
      <div
        data-r="cta"
        className={s.abs}
        style={{ top: REEL_METRICS.postOffset, left: 0, width: 1080, height: 1350 }}
      >
        <CtaBody
          palette={palette}
          slide={{
            id: "reel-cta",
            kind: "cta",
            subhead,
            headline: "這支影片對你有幫助嗎？",
            stats: ["按讚", "留言", "分享", "收藏"],
            imageUrl: "",
          }}
        />
      </div>
    </>
  );
}

/* ================= 時間軸工具 ================= */

/** 以某個容器為原點量位置。畫布在預覽時被 transform 縮放，所以要換算回畫布座標 */
export function measurer(base: HTMLElement) {
  const b = base.getBoundingClientRect();
  const k = b.width / base.offsetWidth;
  return (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k };
  };
}

export const px = (n: number) => `${n}px`;
export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * 對錯記號。用 SVG 畫，不用 ✗ ✓ 字元：Noto Sans TC 沒有這兩個字，會掉到系統字型、粗細與基線都對不上。
 */
const icon = (d: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const MARK = { bad: icon("M6 6l12 12M18 6L6 18"), ok: icon("M5 12.5l4.5 4.5L19 7") };

/** 彈出來、（選擇性地）在 tout 收掉 */
export const pop = (t: number, tout?: number): Keys => [
  [t, { o: 0, s: 0.3 }],
  [t + 0.4, { o: 1, s: 1, e: "back" }],
  ...(tout === undefined
    ? []
    : ([
        [tout, { o: 1 }],
        [tout + 0.4, { o: 0, e: "in" }],
      ] satisfies Keys)),
];

/** 被踢掉：往下掉、縮小、淡出 */
export const evict = (t: number): Keys => [
  [t, { o: 1, y: 0, s: 1 }],
  [t + 0.5, { o: 0, y: 40, s: 0.9, e: "in" }],
];

/** 被踢掉，在 back 回到原位（下一回合重新比） */
export const evictBack = (t: number, back: number): Keys => [
  ...evict(t),
  [back, { o: 0, y: 0, s: 1 }],
  [back + 0.4, { o: 1 }],
];

/** 跟著它所在的那份 grid 一起淡出 */
export const fadeWith = (t: number): Keys => [
  [t, {}],
  [t + 0.5, { o: 0, e: "inOut" }],
];

/** 整份 grid 在 tin 淡入、tout 淡出（換一份 grid 就是換一個場景） */
export const gridSpan = (tin: number, tout: number): Keys => [
  [tin, { o: 0 }],
  [tin + 0.5, { o: 1, e: "inOut" }],
  ...fadeWith(tout),
];

/** 從聚焦時間表排出某一塊的亮暗：只在亮暗改變時補兩格 */
function focusKeys(focus: FocusAt, area: Area): Keys {
  const keys: Keys = [[0, { o: 1 }]];
  let prev = 1;
  for (const [t, lit] of focus) {
    const o = lit === "all" || lit.includes(area) ? 1 : DIM;
    if (o === prev) continue;
    keys.push([t, { o: prev }], [t + 0.35, { o, e: "inOut" }]);
    prev = o;
  }
  return keys;
}

/** 某個策略值的翻牌：舊的往上收，新的從下面翻上來 */
function policyKeys(at: PolicyAt, policy: string): Keys {
  const keys: Keys = [[0, { o: at[0][1] === policy ? 1 : 0 }]];
  at.forEach(([t, p], i) => {
    if (i === 0) return;
    const before = at[i - 1][1];
    if (p === policy) keys.push([t, { o: 0, y: 24 }], [t + 0.4, { o: 1, y: 0 }]);
    if (before === policy) keys.push([t, { o: 1, y: 0 }], [t + 0.4, { o: 0, y: -24, e: "in" }]);
  });
  return keys;
}

/**
 * 在 build 裡用的工具組：找節點、量格子、畫框與記號、讓新 key 飛進格子。
 * 標註節點一律用 tl.create 建在 overlay 上，dispose 時會一起收掉
 */
export function panelKit(root: HTMLElement, tl: Timeline) {
  const q = (name: string) => root.querySelector<HTMLElement>(`[data-r="${name}"]`)!;
  const qa = (name: string) => [...root.querySelectorAll<HTMLElement>(`[data-r="${name}"]`)];
  const cards = (grid: string) => [...q(grid).children] as HTMLElement[];

  const overlay = q("overlay");
  const rel = measurer(q("demo"));
  // 每一份 grid 版面都一樣，量第一份就好
  const slots = cards(q("grid").children[0].getAttribute("data-r")!).map(rel);
  const bar = rel(q("barTrack"));

  const ring = (r: Rect, cls = "") =>
    tl.create(overlay, cx(s.ring, cls), {
      left: px(r.x - 9),
      top: px(r.y - 9),
      width: px(r.w + 18),
      height: px(r.h + 18),
    });
  /** 記號置中在格子的右上角、壓在格子間的空隙裡：放進格子內會蓋到文字 */
  const mark = (r: Rect, kind: "ok" | "bad") =>
    tl.create(
      overlay,
      cx(s.mark, kind === "ok" && s.ok),
      { left: px(r.x + r.w - 18), top: px(r.y - 18) },
      MARK[kind],
    );
  /** 掛在會移動的元素身上的 ✗，跟著它走 */
  const markOn = (el: HTMLElement) =>
    tl.create(el, s.mark, { right: "-18px", top: "-18px" }, MARK.bad);
  const tag = (r: Rect, text: string, bad = false) =>
    tl.create(
      overlay,
      cx(s.tag, bad && s.bad),
      { left: px(r.x + r.w / 2), top: px(r.y - 26) },
      text,
    );
  /** 新寫進來的 key，先放在第 i 格，再用 flyIn 讓它從指令列飛過去 */
  const newKey = (i: number, key: RedisKey, focus?: KeyFocus) =>
    tl.create(
      overlay,
      cx(s.key, s.flying),
      { left: px(slots[i].x), top: px(slots[i].y), width: px(slots[i].w), height: px(slots[i].h) },
      keyBody(key, focus),
    );
  /** 從指令列（pill 的中心）冒出來，飛進第 i 格 */
  const flyIn = (i: number, pill: string, t: number): Keys => {
    const p = center(rel(q(pill)));
    const r = center(slots[i]);
    return [
      [t, { o: 0, x: p.x - r.x, y: p.y - r.y, s: 0.5 }],
      [t + 0.15, { o: 1 }],
      [t + 0.75, { x: 0, y: 0, s: 1, e: "inOut" }],
    ];
  };
  /** 記憶體滿了寫不進去：從指令列飛向記憶體條、撞到就停住搖頭，掛一個 ✗，tout 退場 */
  const rejected = (pill: string, key: RedisKey, t: number, tout: number) => {
    const el = newKey(0, key);
    tl.track(markOn(el), pop(t + 0.75));
    const p = center(rel(q(pill)));
    const r = center(slots[0]);
    // 停在記憶體條正中間、縮小，不蓋到左邊的標籤與右邊的「已滿」
    const x = bar.x + bar.w / 2 - r.x;
    tl.track(el, [
      [t, { o: 0, x: p.x - r.x, y: p.y - r.y, s: 0.4 }],
      [t + 0.15, { o: 1 }],
      [t + 0.6, { x, y: bar.y + bar.h / 2 - r.y, s: 0.55, e: "in" }],
      [t + 0.7, { x: x - 16 }],
      [t + 0.8, { x: x + 16 }],
      [t + 0.9, { x: x - 10 }],
      [t + 1.0, { x }],
      [tout, {}],
      [tout + 0.4, { o: 0, e: "in" }],
    ]);
  };
  /** 指令列上的指令：同一個位置，一個換下一個 */
  const pill = (name: string, tin: number, tout: number) =>
    tl.show(q(name), tin, tout, { from: { o: 0, x: -40 }, to: { o: 0, x: 40 } });

  /**
   * 面板本身的時間軸：頁首、聚焦、策略翻牌、面板進出場、記憶體條。
   * red 是「寫不進去」的區間：記憶體條變紅、掛上「已滿」，b 為 null 表示留到最後
   */
  const chrome = (opts: {
    focus: FocusAt;
    policyAt: PolicyAt;
    /** 面板出現的區間 */
    shown: [number, number][];
    /** 記憶體條從 0 填滿的時間 */
    fill: [number, number];
    red: [number, number | null][];
  }) => {
    tl.track(q("header"), [
      [0, { o: 0, x: -40 }],
      [0.5, { o: 1, x: 0 }],
    ]);
    AREAS.forEach((area) => tl.track(q(area), focusKeys(opts.focus, area)));
    policiesOf(opts.policyAt).forEach((p) => tl.track(q(`pol-${p}`), policyKeys(opts.policyAt, p)));
    tl.track(
      q("mem"),
      opts.shown.flatMap(([a, b]): Keys => [
        [a, { o: 0, y: 30 }],
        [a + 0.5, { o: 1, y: 0 }],
        [b, { o: 1, y: 0 }],
        [b + 0.5, { o: 0, y: -40, e: "in" }],
      ]),
    );
    tl.track(q("barFill"), [
      [opts.fill[0], { cw: 0 }],
      [opts.fill[1], { cw: 100, e: "inOut" }],
    ]);
    tl.track(
      q("barFull"),
      opts.red.flatMap(([a, b]): Keys => [
        [a, { o: 0 }],
        [a + 0.4, { o: 1 }],
        ...(b === null
          ? []
          : ([
              [b, { o: 1 }],
              [b + 0.4, { o: 0 }],
            ] satisfies Keys)),
      ]),
    );
    tl.track(
      q("full"),
      opts.red.flatMap(([a, b]) => pop(a + 0.1, b ?? undefined)),
    );
  };

  return {
    q,
    qa,
    cards,
    overlay,
    rel,
    slots,
    bar,
    ring,
    mark,
    markOn,
    tag,
    newKey,
    flyIn,
    rejected,
    pill,
    chrome,
    /** 給 reel 自己的標註用的 class */
    cls: s,
  };
}
