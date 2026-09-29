import s from "./reel.module.css";
import { Caption, CodeBlock } from "@/components/reel-parts";
import { RichText } from "@/components/rich-text";
import { CtaBody } from "@/components/slide-card";
import type { Timeline } from "@/lib/reel/timeline";
import type { ReelDefinition } from "@/lib/reel/types";
import { REEL_METRICS, type Palette } from "@/lib/theme";

const CARDS = [
  { title: "Grid", desc: "二維佈局。" },
  { title: "Subgrid 讓子層繼承父層軌道", desc: "巢狀元素終於能和外層網格對齊，不必再寫死高度。" },
  { title: "Flexbox", desc: "一維佈局，適合把元素排成一排並分配空間。" },
];

const FIELDS = [
  { label: "姓名", value: "王小明" },
  { label: "電子郵件地址", value: "hi@example.com" },
  { label: "手機號碼", value: "0912-345-678" },
];

const BROWSERS = [
  ["Chrome", "117"],
  ["Edge", "117"],
  ["Safari", "16"],
  ["Firefox", "71"],
];

const EXPLAIN = [
  "父層 `.cards` 自動產生 row 1、2、3",
  "每張 `.card` 跨 3 列，並用 `subgrid` 直接沿用",
  "同一列共用高度，內容自然對齊",
];

/**
 * 同一組卡片的幾種排法：flex（原本）→ 每張各自 grid → subgrid，
 * 另外兩種是「只寫一半」的反例：少了 span 3、少了 subgrid。
 */
type Layout = "flex" | "grid" | "subgrid" | "noSpan" | "noSub";

function Cards({ name, layout }: { name: string; layout: Layout }) {
  const variant = { flex: "", grid: s.grid, subgrid: s.sub, noSpan: s.noSpan, noSub: s.noSub }[
    layout
  ];
  return (
    <div data-r={name} className={`${s.cards} ${variant}`}>
      {CARDS.map((card) => (
        <div key={card.title} className={s.card}>
          <div className={s.cardTitle}>{card.title}</div>
          <div className={s.cardDesc}>{card.desc}</div>
          <div className={s.cardBtn}>看更多</div>
        </div>
      ))}
    </div>
  );
}

function Form({ name, sub }: { name: string; sub?: boolean }) {
  return (
    <div data-r={name} className={`${s.formCard} ${sub ? s.sub : ""}`}>
      {FIELDS.map((field) => (
        <div key={field.label} className={s.field}>
          <label>{field.label}</label>
          <div className={s.input}>{field.value}</div>
        </div>
      ))}
    </div>
  );
}

function Scene({ palette }: { palette: Palette }) {
  const demoTop = REEL_METRICS.demo.top;
  return (
    <>
      <Caption
        name="c1"
        tone="bad"
        title={"卡片裡的按鈕\n怎麼總是**對不齊**？"}
        palette={palette}
      />
      <Caption
        name="c2"
        tone="bad"
        title={"因為每張卡片\n都在**各自排版**"}
        sub="標題、內文長短不同，每一列的高度也跟著不同"
        palette={palette}
      />
      <Caption
        name="c9"
        title={"改用 **grid** 呢？"}
        sub="讓每張卡片把按鈕推到最底"
        palette={palette}
      />
      <Caption
        name="c10"
        tone="bad"
        title={"按鈕對齊了\n但**內文**還是歪的"}
        sub="每張卡片的 grid 還是各算各的列高"
        palette={palette}
      />
      <Caption
        name="c3"
        title={"用 **subgrid**\n讓每一列都對齊"}
        sub="讓子元素直接沿用父層 grid 的軌道"
        palette={palette}
      />
      <Caption
        name="c4"
        title="全部**對齊**了"
        sub="每一列的高度，由三張卡片中最高的那格決定"
        palette={palette}
      />
      <Caption
        name="c11"
        tone="bad"
        title={"少了 **span 3**\n全擠在一格"}
        sub="subgrid 只借得到卡片跨過的那 1 條 row"
        palette={palette}
      />
      <Caption
        name="c12"
        tone="bad"
        title={"少了 **subgrid**\n還是各算各的"}
        sub="卡片跨了 3 條 row，裡面卻沒用它們"
        palette={palette}
      />
      <Caption name="c5" title={"兩個都寫：\n子層**借用**父層的列"} palette={palette} />
      <Caption
        name="c7"
        tone="bad"
        title={"再舉一例：\n表單 label **長短不一**"}
        sub="每個欄位自己排，輸入框就各站各的"
        palette={palette}
      />
      <Caption
        name="c8"
        title={"換成 **columns**\n一樣適用"}
        sub="所有輸入框從同一條線開始"
        palette={palette}
      />
      <Caption name="c6" title="瀏覽器支援？" sub="主流瀏覽器都已支援" palette={palette} />

      <div data-r="demo" className={`${s.abs} ${s.demo}`} style={{ top: demoTop }}>
        <Cards name="gridA" layout="flex" />
        <Cards name="gridM" layout="grid" />
        <Cards name="gridB" layout="subgrid" />
        <Cards name="gridS1" layout="noSpan" />
        <Cards name="gridS2" layout="noSub" />
        <div data-r="overlay" />
      </div>

      <div data-r="demo2" className={`${s.abs} ${s.demo}`} style={{ top: demoTop }}>
        <Form name="formA" />
        <Form name="formB" sub />
        <div data-r="overlay2" />
      </div>

      <CodeBlock
        name="codeA"
        lines={[
          "/* 原本的寫法 */",
          ".card {",
          "  display: flex;",
          "  flex-direction: column;",
          "}",
          "/* 每張卡片只看得到自己 */",
        ]}
      />
      <CodeBlock
        name="codeG"
        highlight={3}
        lines={[
          "/* 第二步：每張卡片各自用 grid */",
          ".card {",
          "  display: grid;",
          "  grid-template-rows: auto 1fr auto;",
          "}",
        ]}
      />
      <CodeBlock
        name="codeB"
        highlight={7}
        lines={[
          ".cards {",
          "  display: grid;",
          "  grid-template-columns: repeat(3, 1fr);",
          "}",
          ".card {",
          "  display: grid;",
          "  grid-row: span 3;",
          "  grid-template-rows: subgrid;",
          "}",
        ]}
      />
      <CodeBlock
        name="codeS1"
        lines={[
          ".card {",
          "  display: grid;",
          "  grid-template-rows: subgrid;",
          "  /* 少了 grid-row: span 3 */",
          "}",
        ]}
      />
      <CodeBlock
        name="codeS2"
        lines={[
          ".card {",
          "  display: grid;",
          "  grid-row: span 3;",
          "  /* 少了 grid-template-rows: subgrid */",
          "}",
        ]}
      />
      <CodeBlock
        name="codeC"
        highlight={7}
        lines={[
          ".form {",
          "  display: grid;",
          "  grid-template-columns: auto 1fr;",
          "}",
          ".field {",
          "  display: grid;",
          "  grid-column: span 2;",
          "  grid-template-columns: subgrid;",
          "}",
        ]}
      />

      <div data-r="explain" className={`${s.abs} ${s.explain}`} style={{ top: 1200 }}>
        {EXPLAIN.map((text, i) => (
          <div key={text} data-r={`ch${i}`} className={s.chip}>
            <b>0{i + 1}</b>
            {/* 跟大標同一套行內標記，`程式碼` 一樣是 chip */}
            <div style={{ flex: 1 }}>
              <RichText value={text} palette={palette} />
            </div>
          </div>
        ))}
      </div>

      <div className={`${s.abs} ${s.support}`} style={{ top: 660 }}>
        {BROWSERS.map(([name, ver]) => (
          <div key={name} data-r="browser" className={s.browser}>
            <span className={s.browserName}>{name}</span>
            <span className={s.browserVer}>
              {ver}
              <small>+</small>
            </span>
          </div>
        ))}
      </div>
      <div data-r="baseline" className={`${s.abs} ${s.baseline}`} style={{ top: 1280 }}>
        Baseline 2023，可以放心用了
      </div>

      <div data-r="summary" className={`${s.abs} ${s.summary}`} style={{ top: 300 }}>
        <span>grid-template-rows:</span> subgrid;
        <br />
        <span>grid-template-columns:</span> subgrid;
      </div>
      {/* 結尾直接用貼文的 CTA 頁，整塊往下平移到 9:16 畫布的中間 */}
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
            subhead: "先收藏，下次要對齊就用它",
            headline: "這支影片對你有幫助嗎？",
            stats: ["按讚", "留言", "分享", "收藏"],
            imageUrl: "",
          }}
        />
      </div>
    </>
  );
}

/** 以某個容器為原點量位置。畫布在預覽時被 transform 縮放，所以要換算回畫布座標 */
function measurer(base: HTMLElement) {
  const b = base.getBoundingClientRect();
  const k = b.width / base.offsetWidth;
  return (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k };
  };
}

const px = (n: number) => `${n}px`;

/**
 * 對錯記號一律置中在卡片的右邊框上、壓在卡片間的空隙裡：放進卡片內會蓋到文字。
 * 用 SVG 畫，不用 ✗ ✓ 字元：Noto Sans TC 沒有這兩個字，會掉到系統字型、粗細與基線都對不上。
 */
const icon = (d: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const MARK = { bad: icon("M6 6l12 12M18 6L6 18"), ok: icon("M5 12.5l4.5 4.5L19 7") };

function build(root: HTMLElement, tl: Timeline) {
  const q = (name: string) => root.querySelector<HTMLElement>(`[data-r="${name}"]`)!;
  const qa = (name: string) => [...root.querySelectorAll<HTMLElement>(`[data-r="${name}"]`)];

  /* ---------- 例 1：量卡片 ---------- */
  const overlay = q("overlay");
  const rel = measurer(q("demo"));
  const cardsA = [...q("gridA").children];
  const cardsM = [...q("gridM").children];
  const cardsB = [...q("gridB").children];

  const badGuides: HTMLElement[] = [];
  const badMarks: HTMLElement[] = [];
  for (const card of cardsA) {
    const c = rel(card);
    const b = rel(card.children[2]);
    badGuides.push(
      tl.create(overlay, s.guide, { left: px(c.x - 6), top: px(b.y - 10), width: px(c.w + 12) }),
    );
    badMarks.push(
      tl.create(overlay, s.mark, { left: px(c.x + c.w - 18), top: px(b.y - 26) }, MARK.bad),
    );
  }

  // 每張各自 grid：按鈕都推到底所以對齊了（一條綠線），但內文的起點還是各自不同
  const btnY = rel(cardsM[0].children[2]).y;
  const midOk = tl.create(overlay, `${s.guide} ${s.ok}`, {
    left: "-16px",
    top: px(btnY - 10),
    width: "968px",
  });
  const midOkMark = tl.create(
    overlay,
    `${s.mark} ${s.ok}`,
    { left: "918px", top: px(btnY - 26) },
    MARK.ok,
  );
  const midBad: HTMLElement[] = [];
  const midBadMarks: HTMLElement[] = [];
  for (const card of cardsM) {
    const c = rel(card);
    const d = rel(card.children[1]);
    midBad.push(
      tl.create(overlay, s.guide, { left: px(c.x - 6), top: px(d.y - 8), width: px(c.w + 12) }),
    );
    midBadMarks.push(
      tl.create(overlay, s.mark, { left: px(c.x + c.w - 18), top: px(d.y - 24) }, MARK.bad),
    );
  }

  // subgrid 之後每一列是共用的，所以一列一條線就夠
  const okGuides: HTMLElement[] = [];
  const okMarks: HTMLElement[] = [];
  for (const row of [1, 2]) {
    const y = Math.min(...cardsB.map((c) => rel(c.children[row]).y));
    okGuides.push(
      tl.create(overlay, `${s.guide} ${s.ok}`, { left: "-16px", top: px(y - 10), width: "968px" }),
    );
    okMarks.push(
      tl.create(overlay, `${s.mark} ${s.ok}`, { left: "918px", top: px(y - 26) }, MARK.ok),
    );
  }

  // 反例一（少了 span 3）：每張卡片只跨 1 條 row，內容疊成一團 → 卡片右上角一個 ✗
  const s1Marks = [...q("gridS1").children].map((card) => {
    const c = rel(card);
    return tl.create(overlay, s.mark, { left: px(c.x + c.w - 18), top: px(c.y - 18) }, MARK.bad);
  });
  // 反例二（少了 subgrid）：跟「各自 grid」一樣，內文起點各自不同
  const s2Bad: HTMLElement[] = [];
  const s2Marks: HTMLElement[] = [];
  for (const card of q("gridS2").children) {
    const c = rel(card);
    const d = rel(card.children[1]);
    s2Bad.push(
      tl.create(overlay, s.guide, { left: px(c.x - 6), top: px(d.y - 8), width: px(c.w + 12) }),
    );
    s2Marks.push(
      tl.create(overlay, s.mark, { left: px(c.x + c.w - 18), top: px(d.y - 24) }, MARK.bad),
    );
  }

  // 父層的三條 row 軌道：從第一張卡片的子元素量
  // 三條軌道各用一個輔助色（tints）
  const tints = ["--reel-tint-1", "--reel-tint-2", "--reel-tint-3"];
  const first = cardsB[0];
  const firstRect = rel(first);
  const bands = [...first.children].map((child, i) => {
    const y = rel(child).y;
    const next = first.children[i + 1];
    const bottom = next ? rel(next).y - 16 : firstRect.y + firstRect.h - 26;
    return tl.create(
      overlay,
      s.band,
      {
        top: px(y - 6),
        height: px(bottom - y + 12),
        background: `color-mix(in srgb, var(${tints[i]}) 22%, transparent)`,
      },
      `<span style="background:var(${tints[i]})">row ${i + 1}</span>`,
    );
  });

  /* ---------- 例 2：量表單 ---------- */
  const overlay2 = q("overlay2");
  const rel2 = measurer(q("demo2"));
  const formBad: HTMLElement[] = [];
  const formBadMarks: HTMLElement[] = [];
  for (const field of q("formA").children) {
    const r = rel2(field.children[1]);
    formBad.push(
      tl.create(overlay2, s.vguide, { left: px(r.x - 12), top: px(r.y - 8), height: px(r.h + 16) }),
    );
    formBadMarks.push(
      tl.create(overlay2, s.mark, { left: px(r.x - 28), top: px(r.y - 44) }, MARK.bad),
    );
  }
  const inputsB = [...q("formB").children].map((field) => rel2(field.children[1]));
  const top2 = inputsB[0].y - 20;
  const bottom2 = inputsB[2].y + inputsB[2].h + 20;
  const formOk = tl.create(overlay2, `${s.vguide} ${s.ok}`, {
    left: px(inputsB[0].x - 12),
    top: px(top2),
    height: px(bottom2 - top2),
  });
  const formOkMark = tl.create(
    overlay2,
    `${s.mark} ${s.ok}`,
    { left: px(inputsB[0].x - 28), top: px(top2 - 40) },
    MARK.ok,
  );

  /* ================= 時間軸 ================= */
  // 頁首跟貼文一樣只在開頭與結尾頁出現
  tl.track(q("header"), [
    [0, { o: 0, x: -40 }],
    [0.5, { o: 1, x: 0 }],
    [47.2, { o: 1 }],
    [47.7, { o: 0, e: "in" }],
    [52.0, { o: 0 }],
    [52.5, { o: 1 }],
  ]);

  // 1. 開場：對不齊
  tl.show(q("c1"), 0.1, 3.2);
  cardsA.forEach((c, i) =>
    tl.track(c as HTMLElement, [
      [0.3 + i * 0.12, { o: 0, y: 80, s: 0.94 }],
      [0.9 + i * 0.12, { o: 1, y: 0, s: 1 }],
    ]),
  );
  // 紅線與 ✗ 一路留到 8.8 秒換成 grid 的版本才退場
  badGuides.forEach((g, i) =>
    tl.track(g, [
      [1.3 + i * 0.15, { cw: 0 }],
      [1.8 + i * 0.15, { cw: 100 }],
      [8.8, { cw: 100 }],
      [9.2, { cw: 100, o: 0, e: "in" }],
    ]),
  );
  badMarks.forEach((m, i) =>
    tl.track(m, [
      [1.6 + i * 0.15, { o: 0, s: 0.3 }],
      [2.0 + i * 0.15, { o: 1, s: 1, e: "back" }],
      [8.8, { o: 1 }],
      [9.2, { o: 0, e: "in" }],
    ]),
  );

  // 2. 原因
  tl.show(q("c2"), 3.4, 7.0);
  tl.show(q("codeA"), 3.8, 7.0);

  // 3. 中間步驟：每張卡片各自用 grid —— 按鈕對齊了，內文沒有
  tl.show(q("c9"), 7.2, 10.6);
  tl.show(q("codeG"), 7.4, 14.8);
  tl.track(q("codeG-hl"), [
    [8.2, { hl: 0 }],
    [8.6, { hl: 1 }],
  ]);
  tl.track(q("gridA"), [
    [8.8, { o: 1 }],
    [9.4, { o: 0, s: 0.98, e: "inOut" }],
  ]);
  tl.track(q("gridM"), [
    [8.8, { o: 0, s: 1.02 }],
    [9.4, { o: 1, s: 1, e: "inOut" }],
    [17.5, { o: 1 }],
    [18.1, { o: 0, s: 0.98, e: "inOut" }],
  ]);
  tl.track(midOk, [
    [9.6, { cw: 0 }],
    [10.2, { cw: 100 }],
    [17.5, { cw: 100 }],
    [17.9, { cw: 100, o: 0, e: "in" }],
  ]);
  tl.track(midOkMark, [
    [10.0, { o: 0, s: 0.3 }],
    [10.4, { o: 1, s: 1, e: "back" }],
    [17.5, { o: 1 }],
    [17.9, { o: 0, e: "in" }],
  ]);
  tl.show(q("c10"), 10.8, 14.8);
  midBad.forEach((g, i) =>
    tl.track(g, [
      [11.2 + i * 0.15, { cw: 0 }],
      [11.7 + i * 0.15, { cw: 100 }],
      [17.5, { cw: 100 }],
      [17.9, { cw: 100, o: 0, e: "in" }],
    ]),
  );
  midBadMarks.forEach((m, i) =>
    tl.track(m, [
      [11.5 + i * 0.15, { o: 0, s: 0.3 }],
      [11.9 + i * 0.15, { o: 1, s: 1, e: "back" }],
      [17.5, { o: 1 }],
      [17.9, { o: 0, e: "in" }],
    ]),
  );

  // 4. 解法：subgrid，每一列都共用（配樂在 17.5 drop）
  tl.show(q("c3"), 15.0, 17.4);
  tl.show(q("codeB"), 15.2, 21.8);
  tl.track(q("codeB-hl"), [
    [16.0, { hl: 0 }],
    [16.4, { hl: 1 }],
  ]);
  // 中間讓位給兩個反例，原理那一幕再回來
  tl.track(q("gridB"), [
    [17.5, { o: 0, s: 1.02 }],
    [18.1, { o: 1, s: 1, e: "inOut" }],
    [22.0, { o: 1 }],
    [22.4, { o: 0, s: 0.98, e: "inOut" }],
    [32.0, { o: 0, s: 1.02 }],
    [32.6, { o: 1, s: 1, e: "inOut" }],
    [37.0, { o: 1 }],
    [37.5, { o: 0, y: -40, e: "in" }],
  ]);
  tl.show(q("c4"), 17.7, 21.8);
  okGuides.forEach((g, i) =>
    tl.track(g, [
      [18.3 + i * 0.25, { cw: 0 }],
      [18.9 + i * 0.25, { cw: 100 }],
      [21.8, { cw: 100 }],
      [22.2, { cw: 100, o: 0, e: "in" }],
    ]),
  );
  okMarks.forEach((m, i) =>
    tl.track(m, [
      [18.8 + i * 0.25, { o: 0, s: 0.3 }],
      [19.2 + i * 0.25, { o: 1, s: 1, e: "back" }],
      [21.8, { o: 1 }],
      [22.2, { o: 0, e: "in" }],
    ]),
  );

  // 4.5 只寫一半會怎樣：先少 span 3、再少 subgrid
  tl.show(q("c11"), 22.0, 26.8);
  tl.show(q("codeS1"), 22.2, 26.8);
  tl.track(q("gridS1"), [
    [22.2, { o: 0, s: 1.02 }],
    [22.8, { o: 1, s: 1, e: "inOut" }],
    [27.0, { o: 1 }],
    [27.5, { o: 0, s: 0.98, e: "inOut" }],
  ]);
  s1Marks.forEach((m, i) =>
    tl.track(m, [
      [23.2 + i * 0.15, { o: 0, s: 0.3 }],
      [23.6 + i * 0.15, { o: 1, s: 1, e: "back" }],
      [26.8, { o: 1 }],
      [27.2, { o: 0, e: "in" }],
    ]),
  );
  tl.show(q("c12"), 27.0, 31.8);
  tl.show(q("codeS2"), 27.2, 31.8);
  tl.track(q("gridS2"), [
    [27.2, { o: 0, s: 1.02 }],
    [27.8, { o: 1, s: 1, e: "inOut" }],
    [32.0, { o: 1 }],
    [32.5, { o: 0, s: 0.98, e: "inOut" }],
  ]);
  s2Bad.forEach((g, i) =>
    tl.track(g, [
      [28.2 + i * 0.15, { cw: 0 }],
      [28.7 + i * 0.15, { cw: 100 }],
      [31.8, { cw: 100 }],
      [32.2, { cw: 100, o: 0, e: "in" }],
    ]),
  );
  s2Marks.forEach((m, i) =>
    tl.track(m, [
      [28.5 + i * 0.15, { o: 0, s: 0.3 }],
      [28.9 + i * 0.15, { o: 1, s: 1, e: "back" }],
      [31.8, { o: 1 }],
      [32.2, { o: 0, e: "in" }],
    ]),
  );

  // 5. 原理：示範區縮小，左邊空出位置放 row 標籤
  tl.track(q("demo"), [
    [31.9, {}],
    [32.5, { x: 40, s: 0.86, e: "inOut" }],
  ]);
  tl.show(q("c5"), 32, 37);
  bands.forEach((b, i) =>
    tl.track(b, [
      [32.5 + i * 0.35, { o: 0, s: 0.96 }],
      [33 + i * 0.35, { o: 1, s: 1, e: "back" }],
      [37, { o: 1 }],
      [37.5, { o: 0, y: -40, e: "in" }],
    ]),
  );
  [0, 1, 2].forEach((i) => tl.show(q(`ch${i}`), 32.6 + i * 1.1, 37, { from: { o: 0, x: 60 } }));

  // 6. 例 2：表單，換成 columns
  tl.show(q("c7"), 37.6, 40.5);
  tl.track(q("formA"), [
    [37.8, { o: 0, y: 80, s: 0.96 }],
    [38.4, { o: 1, y: 0, s: 1 }],
    [42.5, { o: 1 }],
    [43.1, { o: 0, s: 0.98, e: "inOut" }],
  ]);
  tl.track(q("formB"), [
    [42.5, { o: 0, s: 1.02 }],
    [43.1, { o: 1, s: 1, e: "inOut" }],
    [47, { o: 1 }],
    [47.5, { o: 0, y: -40, e: "in" }],
  ]);
  formBad.forEach((g, i) =>
    tl.track(g, [
      [38.8 + i * 0.15, { ch: 0 }],
      [39.2 + i * 0.15, { ch: 100 }],
      [42.5, { ch: 100 }],
      [42.9, { ch: 100, o: 0, e: "in" }],
    ]),
  );
  formBadMarks.forEach((m, i) =>
    tl.track(m, [
      [39.1 + i * 0.15, { o: 0, s: 0.3 }],
      [39.5 + i * 0.15, { o: 1, s: 1, e: "back" }],
      [42.5, { o: 1 }],
      [42.9, { o: 0, e: "in" }],
    ]),
  );
  tl.show(q("c8"), 40.7, 47);
  tl.show(q("codeC"), 40.9, 47);
  tl.track(q("codeC-hl"), [
    [41.6, { hl: 0 }],
    [42, { hl: 1 }],
  ]);
  tl.track(formOk, [
    [43.3, { ch: 0 }],
    [43.9, { ch: 100 }],
    [47, { ch: 100 }],
    [47.4, { ch: 100, o: 0, e: "in" }],
  ]);
  tl.track(formOkMark, [
    [43.7, { o: 0, s: 0.3 }],
    [44.1, { o: 1, s: 1, e: "back" }],
    [47, { o: 1 }],
    [47.4, { o: 0, e: "in" }],
  ]);

  // 7. 瀏覽器支援
  tl.show(q("c6"), 47.6, 51.8);
  qa("browser").forEach((b, i) =>
    tl.show(b, 48 + i * 0.2, 51.8, { from: { o: 0, y: 60, s: 0.9 }, to: { o: 0, s: 0.9 } }),
  );
  tl.show(q("baseline"), 49.2, 51.8, { from: { o: 0, s: 0.8 } });

  // 8. 結尾：貼文同款的 CTA 頁
  tl.show(q("summary"), 52.1, null, { d: 0.6, from: { o: 0, s: 0.85 } });
  tl.show(q("cta"), 52.6, null, { d: 0.6 });
}

export const cssSubgrid: ReelDefinition = {
  id: "css-subgrid",
  title: "CSS subgrid：讓子元素對齊父層網格",
  handle: "@leo.web.dev",
  series: "CSS 小技巧",
  tag: "subgrid",
  theme: "dark",
  duration: 55,
  poster: 20,
  Scene,
  build,
  music: {
    drop: 17.5,
    cues: [
      ...[
        1.65, 1.8, 1.95, 11.55, 11.7, 11.85, 23.35, 23.5, 23.65, 28.65, 28.8, 28.95, 39.15, 39.3,
        39.45,
      ].map((at) => ({
        kind: "bonk" as const,
        at,
      })),
      ...[3.4, 7.2, 10.8, 15.0, 22.0, 27.0, 32.0, 37.6, 40.7, 47.6, 52.1].map((at) => ({
        kind: "whoosh" as const,
        at,
      })),
      { kind: "chime", at: 10.1, note: 81 },
      { kind: "chime", at: 18.9, note: 84 },
      { kind: "chime", at: 19.15, note: 88 },
      { kind: "chime", at: 43.8, note: 88 },
      { kind: "chime", at: 52.2, note: 81 },
      { kind: "chime", at: 52.35, note: 88 },
    ],
  },
};
