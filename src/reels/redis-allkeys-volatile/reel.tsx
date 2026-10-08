import s from "./reel.module.css";
import { Caption } from "@/components/reel-parts";
import type { Timeline } from "@/lib/reel/timeline";
import type { ReelDefinition } from "@/lib/reel/types";
import type { Palette } from "@/lib/theme";
import {
  Chips,
  Ending,
  KeyGrid,
  RedisPanel,
  Steps,
  evict,
  evictBack,
  fadeWith,
  gridSpan,
  measurer,
  panelKit,
  pop,
  px,
  type Command,
  type FocusAt,
  type Keys,
  type PolicyAt,
  type RedisKey,
} from "../redis-shared/panel";

/**
 * 快取（有 TTL）和不能丟的資料（沒設 TTL）放在同一台。TTL 的分配讓三種策略各踢不同的 key：
 * allkeys-lru 踢 config:site（全場最久沒用）、volatile-lru 踢 cache:list（有 TTL 的裡面最久沒用）、
 * volatile-ttl 踢 cache:rank（TTL 剩最少）
 */
const KEYS: RedisKey[] = [
  { name: "config:site", recency: "5 小時前", ttl: "" },
  { name: "session:42", recency: "3 秒前", ttl: "TTL 30 分" },
  { name: "cache:home", recency: "1 分鐘前", ttl: "TTL 10 分" },
  { name: "user:42", recency: "10 秒前", ttl: "" },
  { name: "cache:list", recency: "20 分鐘前", ttl: "TTL 1 小時" },
  { name: "cache:rank", recency: "2 分鐘前", ttl: "TTL 2 分" },
];
const [CONFIG, , , , LIST, RANK] = [0, 1, 2, 3, 4, 5];
const WITH_TTL = KEYS.flatMap((key, i) => (key.ttl ? [i] : []));
const NEW_KEY: RedisKey = { name: "cache:news", recency: "剛剛", ttl: "TTL 5 分" };

/**
 * Redis 8.6 的策略：欄是「從哪些 key 挑」，列是「挑哪一個」，跟片中講的兩半一致。
 * LRM（8.6 新增）兩集都沒演，放在表下的註腳
 */
const TABLE = [
  { rule: "最久沒用", algo: "LRU", allkeys: "allkeys-lru", volatile: "volatile-lru" },
  { rule: "最少使用", algo: "LFU", allkeys: "allkeys-lfu", volatile: "volatile-lfu" },
  { rule: "隨機", algo: "random", allkeys: "allkeys-random", volatile: "volatile-random" },
  { rule: "最快過期", algo: "TTL", allkeys: "", volatile: "volatile-ttl" },
];
/** 兩集演過的策略：表格出齊後依序框起來，讓觀眾把表跟示範對起來 */
const SEEN = [
  "noeviction",
  "allkeys-random",
  "allkeys-lru",
  "allkeys-lfu",
  "volatile-lru",
  "volatile-ttl",
];
const PICKS = [
  { policy: "allkeys-lru", when: "整台都是快取：不確定就選它（官方建議）" },
  { policy: "allkeys-lfu", when: "少數 key 長期很熱，又常有批次掃描" },
  { policy: "volatile-lru", when: "快取和不能丟的資料放在同一台" },
];
const RECAP = ["`allkeys`／`volatile`：從哪些 key 挑", "`lru`／`lfu`／`ttl`：挑哪一個"];

const COMMANDS: Command[] = [
  { name: "p1", cmd: "SET cache:news …" },
  { name: "r0", cmd: "SET cache:news …" },
  { name: "r1", cmd: "SET cache:news …" },
  { name: "r2", cmd: "SET cache:news …" },
  { name: "p2", cmd: "SET cache:news …" },
  { name: "e1", cmd: "(error) OOM command not allowed", err: true },
];

/**
 * 各幕的開始時間。每一步都要停得夠久讓人看清楚（使用者回饋過太快），
 * 時間從這幾個數字推算，要調節奏只改這裡
 */
const SPLIT = 7.4;
const TTL_AT = 14.2;
/** 三回合，每回合 9 秒：策略翻牌 → 指令 → 框出候選 → 標出要踢誰 → 踢掉 → 寫入 */
const ROUNDS = [20.2, 29.2, 38.2];
const ROUND_LEN = 9;
const TRAP = 47.4;
const TABLE_AT = 56.2;
const RECAP_AT = 77.6;
const END = 82.4;

const POLICY_AT: PolicyAt = [
  [0, "allkeys-lru"],
  [ROUNDS[1] + 0.4, "volatile-lru"],
  [ROUNDS[2] + 0.4, "volatile-ttl"],
  [TRAP + 0.4, "volatile-lru"],
];

const FOCUS: FocusAt = [
  [0, "all"],
  [2.2, ["lane"]],
  [3.0, ["grid"]],
  [4.0, ["lane", "grid"]],
  [5.2, ["grid"]],
  [SPLIT - 0.4, "all"],
  [TTL_AT + 0.4, ["grid"]],
  ...ROUNDS.flatMap((r): FocusAt => [
    [r + 0.2, []],
    [r + 1.4, ["lane"]],
    [r + 2.4, ["grid"]],
    [r + 6.3, ["lane", "grid"]],
    [r + ROUND_LEN - 0.2, "all"],
  ]),
  // 沒設 TTL
  [TRAP + 0.2, []],
  [TRAP + 1.4, ["grid"]],
  [TRAP + 3.2, ["lane", "bar"]],
  [TRAP + 5.2, ["lane"]],
  [TABLE_AT - 0.4, "all"],
];

function Scene({ palette }: { palette: Palette }) {
  return (
    <>
      <Caption
        name="c1"
        tone="bad"
        title={"記憶體滿了\n**設定檔**被踢掉了？"}
        sub="allkeys-lru 踢掉了最久沒用的 config:site"
        palette={palette}
      />
      <Caption name="c2" title="策略名稱**分兩半**" palette={palette} />
      <Caption
        name="c3"
        title="什麼是 **TTL**？"
        sub="設了 TTL 的 key，時間到就自動刪掉"
        palette={palette}
      />
      {/* 粗體標出這一回合換掉的那一半 */}
      <Caption
        name="c4"
        title={"**allkeys**-lru\n所有 key 都是候選"}
        sub="最久沒用的就踢，有沒有 TTL 都一樣"
        palette={palette}
      />
      <Caption
        name="c5"
        title={"**volatile**-lru\n只有設 TTL 的是候選"}
        sub="config:site 沒設 TTL，這次安全了"
        palette={palette}
      />
      <Caption
        name="c6"
        title={"volatile-**ttl**\n改挑最快過期的"}
        sub="不看多久沒用，只看 TTL 還剩多少"
        palette={palette}
      />
      <Caption
        name="c7"
        tone="bad"
        title={"沒設 TTL 的話\n**volatile** 踢不動"}
        sub="volatile 一定要搭配 TTL 用"
        palette={palette}
      />
      <Caption
        name="c8"
        title="所以**怎麼選**？"
        sub="兩個問題：從哪些 key 挑？挑哪一個？"
        palette={palette}
      />
      <Caption name="c9" title={"不確定就用\n**allkeys-lru**"} palette={palette} />

      <RedisPanel
        commands={COMMANDS}
        policyAt={POLICY_AT}
        grids={
          <>
            <KeyGrid name="gridA" keys={KEYS} />
            <KeyGrid name="gridT" keys={KEYS} />
          </>
        }
      />

      {/* 策略名稱拆成兩半：前半決定候選範圍、後半決定挑誰 */}
      <div data-r="split" className={s.split} style={{ top: 660 }}>
        <div className={s.half}>
          <code className={s.splitCode}>allkeys</code>
          <div data-r="labL" className={s.splitLabel}>
            從哪些 key 挑
          </div>
          <div data-r="optL" className={s.splitOpt}>
            allkeys／volatile
          </div>
        </div>
        <div className={s.dash}>-</div>
        <div className={s.half}>
          <code className={`${s.splitCode} ${s.right}`}>lru</code>
          <div data-r="labR" className={s.splitLabel}>
            挑哪一個
          </div>
          <div data-r="optR" className={s.splitOpt}>
            lru／lfu／random／ttl
          </div>
        </div>
      </div>

      <div data-r="table" className={s.table} style={{ position: "absolute", top: 470 }}>
        <div data-r="trow" className={`${s.trow} ${s.thead}`}>
          <span />
          <span>
            allkeys<small>全部 key</small>
          </span>
          <span>
            volatile<small>只挑有 TTL 的</small>
          </span>
        </div>
        {TABLE.map((row) => (
          <div key={row.algo} data-r="trow" className={s.trow}>
            <span className={s.rule}>
              {row.rule}
              <small>{row.algo}</small>
            </span>
            {[row.allkeys, row.volatile].map((policy, i) =>
              policy ? (
                <code key={policy} data-r={`cell-${policy}`} className={s.cell}>
                  {policy}
                </code>
              ) : (
                <span key={i} className={s.none}>
                  —
                </span>
              ),
            )}
          </div>
        ))}
        <div data-r="trow" className={s.trow}>
          <span className={s.rule}>
            不踢
            <small>預設</small>
          </span>
          <code data-r="cell-noeviction" className={`${s.cell} ${s.span}`}>
            noeviction
          </code>
        </div>
        <div data-r="trow" className={s.footnote}>
          另有 <code>allkeys-lrm</code>／<code>volatile-lrm</code>：看最後一次寫入（Redis 8.6+）
        </div>
      </div>

      <Steps
        name="hint"
        top={1130}
        items={["框起來的是兩集演過的 6 種"]}
        numbered={false}
        palette={palette}
      />
      <Steps name="pick" top={1130} items={PICKS.map((p) => p.when)} palette={palette} />
      <Chips name="recap" top={620} items={RECAP} palette={palette} />

      <Ending
        palette={palette}
        config={[
          ["maxmemory", "100mb"],
          ["maxmemory-policy", "allkeys-lru"],
        ]}
        subhead="先收藏，下次 Redis 爆記憶體就用它"
      />
    </>
  );
}

function build(root: HTMLElement, tl: Timeline) {
  const k = panelKit(root, tl);
  const { q, qa, cards, slots, ring, mark, tag, newKey, flyIn, pill } = k;
  const c = k.cls;
  const endPanel = TABLE_AT - 0.4;

  k.chrome({
    focus: FOCUS,
    policyAt: POLICY_AT,
    shown: [
      [0.2, SPLIT - 0.4],
      [TTL_AT - 0.2, endPanel],
    ],
    fill: [0.6, 1.8],
    red: [[TRAP + 4.3, null]],
  });

  /* ---------- 1. 痛點：allkeys-lru 把設定檔踢掉了 ---------- */
  tl.show(q("c1"), 0.1, SPLIT - 0.6);
  const gridA = cards("gridA");
  gridA.forEach((card, i) =>
    tl.track(card, [
      [0.3 + i * 0.1, { o: 0, y: 60, s: 0.94 }],
      [0.9 + i * 0.1, { o: 1, y: 0, s: 1 }],
      ...(i === CONFIG ? evict(3.9) : []),
    ]),
  );
  tl.track(q("gridA"), fadeWith(SPLIT - 0.4));
  pill("p1", 2.2, SPLIT - 0.6);
  tl.track(ring(slots[CONFIG], c.bad), pop(3.2, 4.0));
  tl.track(newKey(CONFIG, NEW_KEY), [...flyIn(CONFIG, "p1", 4.2), ...fadeWith(SPLIT - 0.4)]);
  tl.track(mark(slots[CONFIG], "bad"), pop(5.2, SPLIT - 0.6));
  tl.track(tag(slots[CONFIG], "config:site 不見了", true), pop(5.3, SPLIT - 0.6));

  /* ---------- 2. 策略名稱分兩半 ---------- */
  tl.show(q("c2"), SPLIT, TTL_AT - 0.4);
  tl.show(q("split"), SPLIT + 0.2, TTL_AT - 0.6, { from: { o: 0, s: 0.9 } });
  const rise = { from: { o: 0, y: 20 }, to: { o: 0 } };
  tl.show(q("labL"), SPLIT + 1.4, TTL_AT - 0.6, rise);
  tl.show(q("labR"), SPLIT + 2.8, TTL_AT - 0.6, rise);
  tl.show(q("optL"), SPLIT + 4.0, TTL_AT - 0.6, rise);
  tl.show(q("optR"), SPLIT + 4.4, TTL_AT - 0.6, rise);

  /* ---------- 3. 什麼是 TTL ---------- */
  const roundsEnd = ROUNDS[2] + ROUND_LEN;
  tl.show(q("c3"), TTL_AT, ROUNDS[0] - 0.4);
  tl.track(q("gridT"), gridSpan(TTL_AT - 0.2, endPanel));
  WITH_TTL.forEach((i, n) =>
    tl.track(ring(slots[i]), pop(TTL_AT + 1.0 + n * 0.15, ROUNDS[0] - 0.4)),
  );
  tl.track(tag(slots[CONFIG], "沒設 TTL＝永久保存"), pop(TTL_AT + 2.6, ROUNDS[0] - 0.4));

  /* ---------- 4. 三回合：同一組 key，三種策略各踢一次 ---------- */
  const rounds = [
    { candidates: KEYS.map((_, i) => i), victim: CONFIG, why: "沒設 TTL 也照踢" },
    { candidates: WITH_TTL, victim: LIST, why: "有 TTL 裡最久沒用" },
    { candidates: WITH_TTL, victim: RANK, why: "最快過期" },
  ];
  const victimKeys = new Map<number, Keys>();
  rounds.forEach((r, i) => {
    const start = ROUNDS[i];
    const done = start + ROUND_LEN - 0.2;
    const at = start + 2.6; // 候選框出來
    tl.show(q(`c${4 + i}`), start, done);
    pill(`r${i}`, start + 1.6, done);
    r.candidates.forEach((slot, n) => tl.track(ring(slots[slot]), pop(at + n * 0.08, done)));
    // 「為什麼是它」停 2 秒才踢
    tl.track(tag(slots[r.victim], r.why), pop(at + 1.4, at + 3.4));
    tl.track(ring(slots[r.victim], c.bad), pop(at + 2.6, at + 3.4));
    victimKeys.set(r.victim, evictBack(at + 3.4, done));
    tl.track(newKey(r.victim, NEW_KEY), [
      ...flyIn(r.victim, `r${i}`, at + 4.0),
      [done, {}],
      [done + 0.4, { o: 0, e: "in" }],
    ]);
  });
  // volatile 的兩回合：沒設 TTL 的格子變暗、不參加
  const dimmed: Keys = [
    [ROUNDS[1] + 2.0, { o: 1 }],
    [ROUNDS[1] + 2.4, { o: 0.3 }],
    [roundsEnd, { o: 0.3 }],
    [roundsEnd + 0.4, { o: 1 }],
  ];
  cards("gridT").forEach((card, i) => {
    const kicked = victimKeys.get(i) ?? [];
    if (!KEYS[i].ttl) tl.track(card, [...kicked, ...dimmed]);
    else if (kicked.length) tl.track(card, kicked);
  });

  /* ---------- 5. 沒設 TTL：volatile 踢不動 ---------- */
  tl.show(q("c7"), TRAP, endPanel - 0.2);
  qa("ttl").forEach((el) =>
    tl.track(el, [
      [TRAP + 1.8, { o: 1 }],
      [TRAP + 2.2, { o: 0, s: 0.8, e: "in" }],
    ]),
  );
  qa("ttlGone").forEach((el) =>
    tl.track(el, [
      [TRAP + 2.1, { o: 0 }],
      [TRAP + 2.5, { o: 1 }],
    ]),
  );
  pill("p2", TRAP + 3.2, TRAP + 5.2);
  k.rejected("p2", NEW_KEY, TRAP + 3.6, endPanel - 0.2);
  pill("e1", TRAP + 5.4, endPanel);

  /* ---------- 6. 怎麼選：表格 → 對回兩集演過的 → 三個推薦 ---------- */
  const T = TABLE_AT;
  const tableEnd = RECAP_AT - 0.4;
  tl.show(q("c8"), T, tableEnd);
  qa("trow").forEach((row, i) =>
    tl.show(row, T + 0.6 + i * 0.3, tableEnd, { from: { o: 0, y: 30 } }),
  );
  const table = q("table");
  const relT = measurer(table);
  const cellRing = (policy: string) => {
    const r = relT(q(`cell-${policy}`));
    return tl.create(table, c.ring, {
      left: px(r.x - 8),
      top: px(r.y - 8),
      width: px(r.w + 16),
      height: px(r.h + 16),
      borderRadius: "24px",
    });
  };
  // 表格出齊後停 2 秒，再把演過的格子一格一格框起來
  SEEN.forEach((policy, n) => tl.track(cellRing(policy), pop(T + 5.0 + n * 0.45, T + 8.4)));
  tl.show(q("hint0"), T + 5.0, T + 8.4, { from: { o: 0, x: 60 }, to: { o: 0, x: -60 } });
  // 三個推薦，每個 4 秒
  PICKS.forEach((p, i) => {
    const from = T + 9.0 + i * 4.0;
    tl.track(cellRing(p.policy), pop(from, from + 3.8));
    tl.show(q(`pick${i}`), from + 0.2, from + 3.8, { from: { o: 0, x: 60 }, to: { o: 0, x: -60 } });
  });

  /* ---------- 7. 回顧 + 結尾 ---------- */
  tl.show(q("c9"), RECAP_AT, END - 0.4);
  [0, 1].forEach((i) =>
    tl.show(q(`recap${i}`), RECAP_AT + 0.8 + i * 0.8, END - 0.4, { from: { o: 0, x: 60 } }),
  );
  tl.show(q("summary"), END, null, { d: 0.6, from: { o: 0, s: 0.85 } });
  tl.show(q("cta"), END + 0.4, null, { d: 0.6 });
}

export const redisAllkeysVolatile: ReelDefinition = {
  id: "redis-allkeys-volatile",
  title: "Redis 哪些 key 可以踢：allkeys 和 volatile",
  handle: "@leo.web.dev",
  series: "後端小知識",
  tag: "allkeys / volatile",
  theme: "light",
  duration: 87.5,
  poster: 36,
  Scene,
  build,
  music: {
    drop: 30,
    cues: [
      ...[5.25, TRAP + 4.4, TRAP + 5.5].map((at) => ({ kind: "bonk" as const, at })),
      ...[SPLIT, TTL_AT, ...ROUNDS, TRAP, TABLE_AT, RECAP_AT, END].map((at) => ({
        kind: "whoosh" as const,
        at,
      })),
      // 策略翻牌
      ...POLICY_AT.slice(1).map(([at]) => ({ kind: "chime" as const, at: at + 0.3, note: 76 })),
      // 三回合各自寫入成功
      ...ROUNDS.map((r) => ({ kind: "chime" as const, at: r + 7.35, note: 84 })),
      ...PICKS.map((_, i) => ({ kind: "chime" as const, at: TABLE_AT + 9.2 + i * 4.0, note: 84 })),
      { kind: "chime", at: END + 0.1, note: 81 },
      { kind: "chime", at: END + 0.25, note: 88 },
    ],
  },
};
