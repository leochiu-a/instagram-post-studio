import s from "./reel.module.css";
import panel from "../redis-shared/panel.module.css";
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
  center,
  evict,
  fadeWith,
  gridSpan,
  panelKit,
  pop,
  px,
  type Command,
  type FocusAt,
  type Keys,
  type PolicyAt,
  type RedisKey,
} from "../redis-shared/panel";

/** 示範用的 6 個 key：故意有熱有冷，LRU 與 LFU 才挑得出差別 */
const KEYS: RedisKey[] = [
  { name: "user:42", recency: "3 秒前", count: "980" },
  { name: "cart:42", recency: "10 秒前", count: "310" },
  { name: "report:2023", recency: "5 小時前", count: "2" },
  { name: "product:7", recency: "1 分鐘前", count: "450" },
  { name: "config", recency: "8 分鐘前", count: "60" },
  { name: "session:9", recency: "30 分鐘前", count: "15" },
];
const [USER, CART, REPORT, PRODUCT, CONFIG, SESSION] = [0, 1, 2, 3, 4, 5];
const HOT = [USER, CART, PRODUCT];
const NEW_KEY: RedisKey = { name: "product:8", recency: "剛剛", count: "1" };
const exportKey = (n: number): RedisKey => ({ name: `export:${n}`, recency: "剛剛", count: "1" });

/** 抽樣那一幕的 24 個 key 與閒置時間：抽到的 5 個裡最久的是 13，全場最久的 9 沒被抽到 */
const POOL = [
  "8 秒",
  "2 分",
  "12 分",
  "45 秒",
  "20 分",
  "3 秒",
  "1 分",
  "40 秒",
  "9 分",
  "6 小時",
  "15 秒",
  "4 分",
  "30 秒",
  "3 小時",
  "2 秒",
  "11 分",
  "50 秒",
  "7 分",
  "5 分",
  "25 秒",
  "18 分",
  "1 小時",
  "6 秒",
  "33 分",
];
const SAMPLE = [2, 7, 13, 18, 21];
const SAMPLE_PICK = 13;
const TRUE_OLDEST = 9;
const STEPS = [
  "每格的時間＝這個 key 多久沒被用",
  "隨機抽 `maxmemory-samples` 個（預設 5 個）",
  "踢掉抽到的裡面最久沒用的",
];

const COMPARE = [
  {
    name: "LRU",
    full: "Least Recently Used",
    rows: [
      ["看什麼", "多久前用過"],
      ["怕什麼", "批次掃描把熱資料擠掉"],
      ["適合", "大多數快取（官方建議先用它）"],
    ],
  },
  {
    name: "LFU",
    full: "Least Frequently Used",
    rows: [
      ["看什麼", "用過幾次"],
      ["怕什麼", "剛變熱門的新 key 次數還少"],
      ["適合", "熱門 key 長期固定"],
    ],
  },
];

/** 預告下一集：同一台上一個沒設 TTL、一個有 TTL，丟出問題不給答案 */
const TEASER_KEYS = [
  { name: "config:site", note: "網站設定", ttl: "" },
  { name: "cache:list", note: "列表快取", ttl: "TTL 1 小時" },
];
const TEASER = ["`allkeys-lru`：設定檔也可能被踢？", "`volatile-lru`：沒設 TTL 的永遠安全？"];

const COMMANDS: Command[] = [
  { name: "p1", cmd: "SET product:8 …" },
  { name: "e1", cmd: "(error) OOM command not allowed", err: true },
  { name: "p2", cmd: "SET product:8 …" },
  { name: "p3", cmd: "GET user:42" },
  { name: "p4", cmd: "SET product:8 …" },
  { name: "p5", cmd: "SET export:1 … export:5" },
  { name: "p6", cmd: "SET export:1 … export:5" },
];

/**
 * 後半段各幕的開始時間。每一步都要停得夠久讓人看清楚（使用者回饋過太快），
 * 時間從這幾個數字推算，要調節奏只改這裡
 */
const SAMPLING = 35.4;
const FLOOD = 51.8;
const LFU = 61.4;
const COMPARE_AT = 74.8;
const NEXT = 81.4;
const END = 88.0;

const POLICY_AT: PolicyAt = [
  [0, "noeviction"],
  [12.0, "allkeys-random"],
  [24.4, "allkeys-lru"],
  [LFU + 0.6, "allkeys-lfu"],
];

const FOCUS: FocusAt = [
  [0, "all"],
  [0.8, ["bar"]],
  [2.8, ["lane", "bar"]],
  [5.8, []],
  [7.6, ["lane"]],
  [10.8, "all"],
  // 隨機踢：指令進來 → 策略換成 random → 選一格踢掉 → 寫進去
  [11.2, ["lane"]],
  [11.9, []],
  [13.0, ["grid"]],
  [15.6, ["lane", "grid"]],
  // 熱 key 被踢：GET 進來 → 找不到 → 一路掉到資料庫（只剩路徑與資料庫亮著）
  [17.4, ["lane"]],
  [18.0, ["grid"]],
  [19.8, []],
  [23.6, "all"],
  // LRU
  [24.2, []],
  [25.2, ["lane"]],
  [26.0, ["grid"]],
  [29.9, ["lane", "grid"]],
  [31.0, "all"],
  // 批次匯出（LRU）
  [FLOOD, []],
  [FLOOD + 1.0, ["lane", "grid"]],
  [LFU - 0.2, "all"],
  // 同一批匯出換 LFU：先看「存取次數」那一行，再讓匯出跑一次
  [LFU + 0.2, []],
  [LFU + 1.4, ["grid"]],
  [LFU + 2.0, ["lane", "grid"]],
  [LFU + 8.0, "all"],
];

function Scene({ palette }: { palette: Palette }) {
  return (
    <>
      <Caption
        name="c1"
        tone="bad"
        title={"Redis 記憶體滿了\n新資料**寫不進去**？"}
        palette={palette}
      />
      <Caption
        name="c2"
        tone="bad"
        title={"預設策略是\n**什麼都不踢**"}
        sub="讀取照常，寫入直接回錯誤"
        palette={palette}
      />
      <Caption
        name="c3"
        title={"那**隨便踢一個**呢？"}
        sub="allkeys-random：隨機挑一個 key 刪掉"
        palette={palette}
      />
      <Caption
        name="c4"
        tone="bad"
        title={"但**最熱的** key\n也被踢了"}
        sub="下一次 GET user:42 只能回資料庫查"
        palette={palette}
      />
      <Caption
        name="c5"
        title="改用 **LRU**"
        sub="Least Recently Used：踢最久沒被用到的"
        palette={palette}
      />
      <Caption
        name="c6"
        title={"冷資料走\n**熱資料留下**"}
        sub="report:2023 五小時沒人用，先踢它"
        palette={palette}
      />
      <Caption
        name="c7"
        title={"LRU 其實是\n**抽樣**挑出來的"}
        sub="全部排序太花記憶體，只抽幾個來比"
        palette={palette}
      />
      <Caption
        name="c8"
        title={"不一定是**最舊的**\n但已經夠接近"}
        sub="maxmemory-samples 調大更準，也更吃 CPU"
        palette={palette}
      />
      <Caption
        name="c9"
        tone="bad"
        title={"跑一次批次匯出\n熱資料就**被擠掉**"}
        sub="export:* 都剛寫進來，LRU 以為它們最熱"
        palette={palette}
      />
      <Caption
        name="c10"
        title={"同一批匯出\n**改用 LFU** 再跑一次"}
        sub="LFU 看存取次數，不看多新"
        palette={palette}
      />
      <Caption
        name="c11"
        title="熱資料**穩穩留著**"
        sub="export:* 只用過一次，輪流被踢掉"
        palette={palette}
      />
      <Caption name="c12" title={"LRU 和 LFU\n**差在哪**？"} palette={palette} />
      <Caption
        name="c13"
        title={"下一集：\n**allkeys** 還是 volatile？"}
        sub="哪些 key 能踢、哪些不能踢"
        palette={palette}
      />

      <RedisPanel
        commands={COMMANDS}
        policyAt={POLICY_AT}
        grids={
          <>
            <KeyGrid name="gridMain" keys={KEYS} />
            <KeyGrid name="gridLru" keys={KEYS} focus="recency" />
            <KeyGrid name="gridFlood" keys={KEYS} focus="recency" />
            <KeyGrid name="gridLfu" keys={KEYS} focus="count" />
          </>
        }
      >
        <div data-r="db" className={s.db} style={{ left: 560, top: 650, width: 375 }}>
          資料庫
          <small>要等比較久</small>
        </div>
        <div data-r="pool" className={s.pool}>
          {POOL.map((idle, i) => (
            <div key={`key:${i}`} data-r="tile" className={s.tile}>
              <div className={s.tileIdle}>{idle}</div>
              <div className={s.tileKey}>key:{i}</div>
            </div>
          ))}
        </div>
      </RedisPanel>

      <Steps name="step" top={1090} items={STEPS} palette={palette} />

      <div className={s.compare} style={{ position: "absolute", top: 560 }}>
        {COMPARE.map((algo, i) => (
          <div key={algo.name} data-r={`algo${i}`} className={s.algo}>
            <div className={s.algoName}>
              {algo.name}
              <small>{algo.full}</small>
            </div>
            {algo.rows.map(([label, value]) => (
              <div key={label} className={s.algoRow}>
                <small>{label}</small>
                {value}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={s.teaser} style={{ top: 600 }}>
        {TEASER_KEYS.map((key, i) => (
          <div key={key.name} data-r={`teaser${i}`} className={panel.key}>
            <div className={panel.keyName}>{key.name}</div>
            <div className={panel.meta}>{key.note}</div>
            <div className={panel.ttlRow}>
              {key.ttl ? (
                <span className={panel.ttl}>{key.ttl}</span>
              ) : (
                <span className={panel.meta}>沒設 TTL</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <Chips name="ask" top={860} items={TEASER} palette={palette} />

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
  const { q, qa, cards, slots, ring, mark, markOn, tag, newKey, flyIn, pill, rel } = k;
  const c = k.cls;

  k.chrome({
    focus: FOCUS,
    policyAt: POLICY_AT,
    shown: [
      [0.2, SAMPLING - 0.4],
      [FLOOD - 0.2, COMPARE_AT - 0.4],
    ],
    fill: [0.8, 2.4],
    red: [[2.2, 10.8]],
  });

  /* ---------- 1. 痛點：記憶體滿了，寫不進去 ---------- */
  tl.show(q("c1"), 0.1, 5.2);
  const main = cards("gridMain");
  const mainKeys: Keys[] = main.map((_, i) => [
    [0.3 + i * 0.1, { o: 0, y: 60, s: 0.94 }],
    [0.9 + i * 0.1, { o: 1, y: 0, s: 1 }],
  ]);
  pill("p1", 2.8, 7.4);
  k.rejected("p1", NEW_KEY, 3.3, 5.4);

  /* ---------- 2. 原因：預設是 noeviction，寫入回錯誤 ---------- */
  tl.show(q("c2"), 5.4, 10.6);
  pill("e1", 7.8, 10.8);

  /* ---------- 3. 中間步驟：隨機踢 ---------- */
  tl.show(q("c3"), 11.0, 17.0);
  pill("p2", 11.2, 17.2);
  // 選取框在幾格之間亂跳，最後停在 user:42
  const hops = [PRODUCT, SESSION, CART, CONFIG, USER];
  const at = (i: number) => ({ x: slots[i].x - slots[USER].x, y: slots[i].y - slots[USER].y });
  tl.track(ring(slots[USER]), [
    [13.2, { o: 0, ...at(hops[0]), s: 1.1 }],
    [13.4, { o: 1, s: 1 }],
    ...hops.slice(1).flatMap((slot, n): Keys => [
      [13.6 + n * 0.4, at(hops[n])],
      [13.8 + n * 0.4, { ...at(slot), e: "inOut" }],
    ]),
    [15.0, {}],
    [15.3, { o: 0, e: "in" }],
  ]);
  tl.track(ring(slots[USER], c.bad), pop(15.0, 15.4));
  mainKeys[USER].push(...evict(15.3));
  tl.track(newKey(USER, NEW_KEY), [...flyIn(USER, "p2", 15.7), ...fadeWith(23.6)]);

  /* ---------- 4. 熱的被踢了：GET user:42 一路掉到資料庫 ---------- */
  tl.show(q("c4"), 17.2, 23.6);
  pill("p3", 17.4, 23.6);
  // token 停在 user:42 那格的下緣（不蓋住格子裡的字），之後從這裡往下走
  const home = { x: center(slots[USER]).x, y: slots[USER].y + slots[USER].h };
  tl.track(ring(slots[USER], `${c.bad} ${c.dash}`), pop(19.0, 23.6));
  tl.track(tag(slots[USER], "user:42 不見了", true), pop(19.3, 23.6));
  // 從格子底下往下、再往右接到資料庫；token 沿著這條路慢慢走，表示這一趟變慢了
  const db = rel(q("db"));
  const turn = db.y + db.h / 2;
  const down = tl.create(k.overlay, s.path, {
    left: px(home.x - 3),
    top: px(home.y),
    width: "6px",
    height: px(turn - home.y),
  });
  const across = tl.create(k.overlay, s.path, {
    left: px(home.x - 3),
    top: px(turn - 3),
    width: px(db.x - home.x + 3),
    height: "6px",
  });
  // 比路徑晚建，才會蓋在線上面
  const token = tl.create(k.overlay, s.token, { left: px(home.x), top: px(home.y) }, "GET user:42");
  tl.track(markOn(token), pop(19.2, 23.6));
  const tw = rel(token).w;
  const p3 = center(rel(q("p3")));
  tl.track(token, [
    [18.2, { o: 0, x: p3.x - home.x, y: p3.y - home.y, s: 0.6 }],
    [18.35, { o: 1 }],
    [18.95, { x: 0, y: 0, s: 1, e: "inOut" }],
    [20.2, { x: 0, y: 0 }],
    [21.2, { y: turn - home.y, e: "linear" }],
    [22.2, { x: db.x - home.x - tw / 2 - 12, e: "linear" }],
    [23.6, {}],
    [24.0, { o: 0, e: "in" }],
  ]);
  tl.show(q("db"), 19.8, 23.6, { from: { o: 0, x: 40 } });
  tl.track(down, [
    [20.2, { ch: 0 }],
    [21.2, { ch: 100, e: "linear" }],
    [23.6, { ch: 100 }],
    [24.0, { ch: 100, o: 0, e: "in" }],
  ]);
  tl.track(across, [
    [21.2, { cw: 0 }],
    [22.2, { cw: 100, e: "linear" }],
    [23.6, { cw: 100 }],
    [24.0, { cw: 100, o: 0, e: "in" }],
  ]);
  tl.track(ring(db, c.bad), pop(22.3, 23.6));
  main.forEach((card, i) => tl.track(card, mainKeys[i]));
  tl.track(q("gridMain"), fadeWith(23.6));

  /* ---------- 5. 解法：LRU（「最久沒用」標籤停 3 秒才踢） ---------- */
  tl.show(q("c5"), 24.0, 29.0);
  tl.track(q("gridLru"), gridSpan(23.8, SAMPLING - 0.4));
  pill("p4", 25.2, SAMPLING - 0.6);
  tl.track(tag(slots[REPORT], "最久沒用"), pop(26.4, 29.4));

  /* ---------- 6. 結果：踢掉最冷的（配樂在 30 drop） ---------- */
  tl.show(q("c6"), 29.2, SAMPLING - 0.6);
  tl.track(ring(slots[REPORT], c.bad), pop(29.4, 29.9));
  tl.track(cards("gridLru")[REPORT], evict(29.8));
  tl.track(newKey(REPORT, NEW_KEY, "recency"), [
    ...flyIn(REPORT, "p4", 30.1),
    ...fadeWith(SAMPLING - 0.4),
  ]);
  HOT.forEach((slot, n) => tl.track(mark(slots[slot], "ok"), pop(31.2 + n * 0.25, SAMPLING - 0.8)));

  /* ---------- 7. 原理：抽樣（每一步停 3 秒） ---------- */
  const S = SAMPLING;
  tl.show(q("c7"), S, S + 10.4);
  tl.track(q("pool"), [
    [S - 0.2, { o: 0, s: 0.96 }],
    [S + 0.4, { o: 1, s: 1 }],
    [FLOOD - 0.6, { o: 1 }],
    [FLOOD - 0.1, { o: 0, y: -40, e: "in" }],
  ]);
  const tiles = qa("tile");
  const tileRect = tiles.map(rel);
  const next = { from: { o: 0, x: 60 }, to: { o: 0, x: -60 } };
  tl.show(q("step0"), S + 1.0, S + 3.8, next);
  tl.show(q("step1"), S + 4.2, S + 7.0, next);
  // 一個一個抽，看得出是「抽」
  SAMPLE.forEach((i, n) => tl.track(ring(tileRect[i]), pop(S + 4.6 + n * 0.3, S + 10.4)));
  tl.show(q("step2"), S + 7.4, S + 10.4, next);
  tl.track(ring(tileRect[SAMPLE_PICK], c.bad), pop(S + 8.0, S + 9.5));
  tl.track(tiles[SAMPLE_PICK], evict(S + 9.5));

  tl.show(q("c8"), S + 10.6, FLOOD - 0.6);
  tl.track(ring(tileRect[TRUE_OLDEST], `${c.bad} ${c.dash}`), pop(S + 11.4, FLOOD - 0.8));
  tl.track(tag(tileRect[TRUE_OLDEST], "全場最久，沒抽到", true), pop(S + 11.7, FLOOD - 0.8));

  /* ---------- 8. 第二例：批次匯出把熱資料擠掉（LRU） ---------- */
  const F = FLOOD;
  tl.show(q("c9"), F, LFU - 0.4);
  tl.track(q("gridFlood"), gridSpan(F - 0.2, LFU - 0.2));
  pill("p5", F + 1.0, LFU - 0.4);
  // 每個 export:* 都是「剛剛」，LRU 就從最久沒用的開始一路往上踢，踢到熱資料
  const flood = cards("gridFlood");
  [REPORT, SESSION, CONFIG, PRODUCT, CART].forEach((slot, n) => {
    const t = F + 1.8 + n * 0.9;
    tl.track(ring(slots[slot], c.bad), pop(t, t + 0.4));
    tl.track(flood[slot], evict(t + 0.3));
    tl.track(newKey(slot, exportKey(n + 1), "recency"), [
      ...flyIn(slot, "p5", t + 0.5),
      ...fadeWith(LFU - 0.2),
    ]);
  });
  // 熱資料被擠掉的 ✗ 停 2 秒以上再換幕
  [PRODUCT, CART].forEach((slot, n) =>
    tl.track(mark(slots[slot], "bad"), pop(F + 7.0 + n * 0.25, LFU - 0.6)),
  );

  /* ---------- 9. 同一批匯出改用 LFU：批次資料只在自己之間輪替 ---------- */
  const L = LFU;
  tl.show(q("c10"), L, L + 7.8);
  tl.track(q("gridLfu"), gridSpan(L - 0.2, COMPARE_AT - 0.4));
  // 明講這是倒帶，不然 cart、product 又冒出來會以為畫面錯了
  tl.track(tag(slots[CART], "回到匯出前"), pop(L + 0.2, L + 1.6));
  pill("p6", L + 2.0, COMPARE_AT - 0.6);
  const lfu = cards("gridLfu");
  const exportsAt = [0, 1, 2, 3, 4].map((n) => L + 2.6 + n * 1.0);
  tl.track(lfu[REPORT], evict(exportsAt[0]));
  exportsAt.forEach((t, n) => {
    const after = exportsAt[n + 1];
    tl.track(newKey(REPORT, exportKey(n + 1), "count"), [
      ...flyIn(REPORT, "p6", t + 0.3),
      ...(after === undefined ? fadeWith(COMPARE_AT - 0.4) : evict(after)),
    ]);
  });
  tl.show(q("c11"), L + 8.0, COMPARE_AT - 0.6);
  HOT.forEach((slot, n) =>
    tl.track(mark(slots[slot], "ok"), pop(L + 8.4 + n * 0.25, COMPARE_AT - 0.8)),
  );

  /* ---------- 10. LRU 和 LFU 並排 ---------- */
  tl.show(q("c12"), COMPARE_AT, NEXT - 0.4);
  [0, 1].forEach((i) =>
    tl.show(q(`algo${i}`), COMPARE_AT + 0.6 + i * 0.8, NEXT - 0.4, { from: { o: 0, y: 60 } }),
  );

  /* ---------- 11. 預告下一集 + 結尾 ---------- */
  tl.show(q("c13"), NEXT, END - 0.4);
  [0, 1].forEach((i) =>
    tl.show(q(`teaser${i}`), NEXT + 0.6 + i * 0.3, END - 0.4, { from: { o: 0, y: 60 } }),
  );
  [0, 1].forEach((i) =>
    tl.show(q(`ask${i}`), NEXT + 1.6 + i * 1.2, END - 0.4, { from: { o: 0, x: 60 } }),
  );
  tl.show(q("summary"), END, null, { d: 0.6, from: { o: 0, s: 0.85 } });
  tl.show(q("cta"), END + 0.4, null, { d: 0.6 });
}

export const redisLruLfu: ReelDefinition = {
  id: "redis-lru-lfu",
  title: "Redis 記憶體滿了踢誰：LRU 和 LFU",
  handle: "@leo.web.dev",
  series: "後端小知識",
  tag: "LRU / LFU",
  theme: "light",
  duration: 92.5,
  poster: 32,
  Scene,
  build,
  music: {
    drop: 30,
    cues: [
      ...[4.05, 7.9, 19.25, FLOOD + 7.05, FLOOD + 7.3].map((at) => ({
        kind: "bonk" as const,
        at,
      })),
      ...[
        5.4,
        11.0,
        17.2,
        24.0,
        SAMPLING,
        SAMPLING + 10.6,
        FLOOD,
        LFU,
        LFU + 8.0,
        COMPARE_AT,
        NEXT,
        END,
      ].map((at) => ({ kind: "whoosh" as const, at })),
      // 策略翻牌
      ...POLICY_AT.slice(1).map(([at]) => ({ kind: "chime" as const, at: at + 0.3, note: 76 })),
      { kind: "chime", at: 16.4, note: 81 },
      ...[84, 88, 91].map((note, n) => ({ kind: "chime" as const, at: 31.3 + n * 0.25, note })),
      ...[84, 88, 91].map((note, n) => ({
        kind: "chime" as const,
        at: LFU + 8.5 + n * 0.25,
        note,
      })),
      { kind: "chime", at: END + 0.1, note: 81 },
      { kind: "chime", at: END + 0.25, note: 88 },
    ],
  },
};
