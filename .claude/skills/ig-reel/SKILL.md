---
name: ig-reel
description: 在 IG Post Studio 裡做一支 1080×1920 的 Reels 短片（React 場景 + 關鍵影格時間軸 + 合成配樂），並輸出成 MP4。當使用者要做 reels、短影音、IG 影片、把一個技術主題或既有貼文做成影片，或要修改、重新輸出既有的 reel 時使用。觸發詞：reels、reel、短片、短影音、IG 影片、做成影片、輸出影片。
---

# IG Reel

一支 reel 是 `src/reels/<id>/` 底下的兩個檔案，加上 `src/reels/index.ts` 的一行註冊：

```
src/reels/<id>/reel.tsx         ← 場景（Scene）、時間軸（build）、配樂 cue、ReelDefinition
src/reels/<id>/reel.module.css  ← 只管版面，顏色一律吃 --reel-* 變數
```

它不像貼文能從 Markdown 產生 —— 每支影片的動畫都是手寫的。**照抄範本改，不要從零寫**：
[`src/reels/css-subgrid/`](../../../src/reels/css-subgrid) 是完整的一支（45 秒，flex → grid → subgrid
三段、兩個例子、程式碼區塊、對錯標註、結尾 CTA），結構、命名、時間軸寫法都以它為準。

腳本（每一幕講什麼、停多久、怎麼開場）看 [`STORYBOARD.md`](STORYBOARD.md)。
這份只管怎麼把它做進 studio、怎麼驗。

## 流程

1. **先交分鏡，再寫 code。** 照 STORYBOARD.md 列出每一幕的秒數、大標、畫面上有什麼，
   給使用者確認。分鏡改一句話很便宜，時間軸排好之後改一幕要連帶挪後面所有秒數。
2. 複製 `src/reels/css-subgrid/` 成 `src/reels/<id>/`，改 `Scene` 與 `build`。
3. 在 `src/reels/index.ts` 的 `REELS` 加上它。
4. 驗（見〈驗〉），修到四項都過。
5. `pnpm reel <id> --theme dark` 與 `--theme light` 各輸出一支（`renders/<id>-<theme>.mp4`），
   用 SendUserFile 交給使用者。
6. 有做封面（`Cover`）的話，`pnpm reel <id> --cover` 輸出 `renders/<id>-<theme>-cover.png`，一起交出去。

`<id>` 是英文 kebab-case（`css-has`、`view-transitions`）—— 它同時是網址 `/reel/<id>`
與輸出檔名，不用中文，免得每個工具各自 encode 一次。

## ReelDefinition

```ts
export const cssHas: ReelDefinition = {
  id: "css-has",
  title: "CSS :has()：父選擇器終於來了", // 清單與預覽頁上的名字
  handle: "@leo.web.dev",
  series: "CSS 小技巧", // 頁首左邊紫色膠囊裡的系列名
  tag: ":has()", // 膠囊右邊的主題；帳號（handle）在頁首最右邊
  theme: "dark", // 預設配色；預覽頁可以切、輸出時 --theme 覆寫
  duration: 35, // 秒，必須是 2.5 的倍數（見〈配樂〉）
  poster: 15, // 首頁縮圖停在哪一秒：挑「結果」那一幕，不要挑開場
  Cover, // 選填：發 Reels 時另外上傳的封面，也是首頁縮圖（見〈封面〉）
  Scene,
  build,
  music: { drop: 12.5, cues: [...] },
};
```

## Scene：一次畫出所有元素

Scene 把**整支影片會出現的所有東西**同時渲染出來，全部絕對定位疊在一起；誰在什麼時候
出現完全交給時間軸。所以不要用 state、條件渲染或 `useEffect` 控制顯示 ——
時間軸量 DOM 的時候，元素必須已經在那裡。

每個要動的元素都掛 `data-r="名字"`，`build` 用這個名字找它。CSS module 的 class
會被 hash，不能拿來查。

直接用現成的零件，不要自己刻：

| 零件                            | 用途                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Caption`（`reel-parts.tsx`）   | 大標 + 副標。大標走 `RichText`：`**粗體**` 是強調色、`` `code` `` 是跟貼文一樣的 chip，`\n` 換行 |
| `CodeBlock`（`reel-parts.tsx`） | 整塊出現的 CSS 程式碼，`highlight` 那一行會標成 `data-r="<name>-hl"`，用 `hl` 讓它亮起來         |
| `CtaBody`（`slide-card.tsx`）   | 結尾直接用貼文的 CTA 頁，包在 `top: REEL_METRICS.postOffset` 的 1080×1350 容器裡                 |
| `RichText`（`rich-text.tsx`）   | 其他要吃行內標記的文字（例如說明卡片）                                                           |
| 頁首                            | `ReelStage` 自己會畫（`data-r="header"`），Scene 裡不要再放一份                                  |

`CodeBlock` 的語法上色只認 `.selector {`、`property: value;`、`}` 與整行的 `/* 註解 */`。要示範 JS／HTML
的話先擴充 `highlightCss`，不要在 reel 裡另寫一套。

### 配色與版位

顏色只能從 `theme.ts` 的 `REEL_THEMES` 拿，深淺兩套（使用者比過十幾組後定案）：

- **dark**：近黑底 + 紫色品牌、萊姆綠對、紅錯，背景有紫與綠兩團光
- **light**：Catppuccin Latte 的官方色票，藍色品牌、綠對、紅錯

版位、字體、行內標記、結尾 CTA 跟貼文共用，只換顏色。`ReelStage` 依 theme 把配色設成根節點上的
CSS 變數；Scene 拿到的 `palette`（`REEL_PALETTE`）與 CSS module **都只認變數**，所以同一份
場景兩套配色都能用。**在 Scene、CSS、build 裡都不要寫死顏色**，連 `rgb(... / 20%)` 這種
半透明也一樣 —— 用 `color-mix(in srgb, var(--reel-ok) 20%, transparent)`，不然淺色版會殘留深色版的顏色。
可用的變數：

| 變數                                                                             | 用在                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 繼承的 `color`                                                                   | 大標、卡片標題                                         |
| `--reel-muted`                                                                   | 副標、次要文字、卡片內文                               |
| `--reel-brand`（紫）                                                             | 系列膠囊、示範 UI 的按鈕、CTA 膠囊                     |
| `--reel-ok`（萊姆綠）                                                            | 解法、✓、修好後的對齊線、說明卡片的編號                |
| `--reel-bad`（紅）                                                               | 問題、✗、壞掉的對齊線                                  |
| `--reel-card` / `--reel-panel` / `--reel-line`                                   | 示範 UI 的底、面板的底、所有邊框                       |
| `--reel-tint-1` / `-2` / `-3`                                                    | 三個輔助色，互相區分用（row 色帶與標籤）               |
| `--reel-chip`                                                                    | 說明卡片裡 `` `code` `` chip 的字色                    |
| `--reel-code-*`（bg、text、line、selector、property、value、comment、highlight） | 程式碼區塊與總結專用；淺色版是深底（Catppuccin Mocha） |

顏色有固定意思，不要當裝飾：紫 = 帳號，綠 = 對，紅 = 錯。大標的 `**粗體**` 跟著這一幕的語氣走 ——
`<Caption tone="bad">` 是紅（痛點、原因），預設是綠（解法、結果）。一句只粗一處。

面板圓角 24～28，底是 `--reel-card` 或 `--reel-panel`、框是 `2px solid var(--reel-line)`。
**程式碼一律用 `--reel-code-*`，不要用頁面的顏色排程式碼**：淺色版頁面的粉彩色放在淺底上對比只有 2～2.8:1，
使用者實際回饋過看不到；程式碼區塊有自己的深底才讀得清楚。畫面上任何一段程式碼（包括結尾總結）都放進 code 面板。
需要新角色就在 `ReelColors` 加欄位、兩套都填、在 `reelCssVars` 補上變數，並寫明它的意思。
改完配色兩套都要截定格看（淺底上最容易出問題的是壓在彩色上的字，`--reel-ink` / `--reel-brand-ink`）。
字體只有 `var(--font-slide)`（Noto Sans TC 400/700）與 `var(--font-jetbrains)`；
沒載 800，寫 800 會被瀏覽器假粗體。

版位沿用貼文的左右邊界：內容區 `left: 71.12px`（`Caption` 用 73.04）、寬 935.84。
垂直方向照 `REEL_METRICS`：大標 250、示範區 620、程式碼 1180。
**y > 1550 不放重點** —— IG 的說明文字與右側按鈕會蓋在那裡。

## build：量 DOM，排時間軸

`build(root, tl)` 在字型載入、版面排好之後跑一次。能量真實位置，所以對齊線、記號、
色帶都要**從 DOM 量出來畫**，不要寫死座標 —— 內容一改，寫死的線就對不上了。

```ts
const q = (name: string) => root.querySelector<HTMLElement>(`[data-r="${name}"]`)!;
const rel = measurer(q("demo")); // 以容器為原點、換算回畫布座標（預覽時畫布有被縮放）
const r = rel(someElement); // { x, y, w, h }
const line = tl.create(overlay, s.guide, { left: px(r.x), top: px(r.y), width: px(r.w) });
```

- 標註節點只能用 `tl.create` 建：它會在 `dispose` 時一起收掉。自己 `appendChild`
  的節點在 Strict Mode 下會長出兩份。
- `measurer`、`px`、`MARK`（✓ ✗ 的 SVG）從範本抄過去（放模組層級，不要放在 build 裡面）。
  記號不要用 ✓ ✗ 字元：Noto Sans TC 沒有這兩個字，會掉到系統字型。
- 記號置中在卡片的邊框上、壓在空隙裡（`left: c.x + c.w - 18`），不要放進卡片內 ——
  內距只有 26px，放進去一定蓋到文字。

時間軸 API（`src/lib/reel/timeline.ts`）：

```ts
tl.show(el, 進場秒, 退場秒 | null, { d?, from?, to? }); // 最常用：淡入上移、淡出上移
tl.track(el, [[秒, { o, x, y, s, cw, ch, hl, e }], ...]); // 自己排關鍵影格
```

- `o` 透明度、`x`/`y` 位移、`s` 縮放、`cw`/`ch` 由左往右／由上往下揭露（畫線用）、
  `hl` 程式碼高亮行的亮度、`e` 是**到這一格**的緩動（`out` 預設、`in`、`inOut`、`back`、`linear`）。
- 沒寫到的屬性沿用前一格。第一格之前停在第一格、最後一格之後停在最後一格。

**同一個元素只能有一條 track。** 兩條 track 作用在同一個元素時，後排的那條在任何時間點
都會蓋掉前一條 —— 包括它還沒開始的時候（停在它的第一格）。要進場、退場、再進場，
就把所有關鍵影格寫進同一個 `tl.track`（範本裡的 `header` 就是這樣）。
`tl.show` 本身也是一條 track，不能跟同一個元素的其他 `show`／`track` 疊用。
`Timeline.track` 碰到第二條會直接 throw（`pnpm reel --stills` 會印出「頁面錯誤：同一個元素排了兩條 track」）
—— 範本第一版就踩過：✗ 記號多排了一條退場 track，結果從第 0 秒就掛在畫面上。

兩種版面的切換（例如 flex → subgrid）不要用動畫去內插版面：把兩份都畫出來疊在一起，
交叉淡入淡出（範本的 `gridA` / `gridB`）。版面是離散的，硬要補間只會看到東西亂跳。

## 封面

`Cover` 是一個靜態的 React 元件，畫在同一張 1080×1920 畫布上（頁首會自動畫），不跑時間軸。
預覽頁右上角可以切「影片／封面」，`pnpm reel <id> --cover` 截成 PNG 給使用者上傳到 IG。

- IG 個人頁的格子會把封面裁成中間的 1080×1440（3:4），重點放在 y 240～1680，最好置中在這段。
- 寫成觀眾自己會問的問題（「Redis 記憶體滿了，會先刪掉哪些資料？」）加上片中的示範畫面縮影，不要寫答案。
  「該 X 誰？」這種設問句有 AI 感（使用者回饋過），用實際會講的話。
- 片名、集數放在大標上方的膠囊；顏色與零件一樣只用 `--reel-*` 變數與現成 CSS。

## 配樂

曲子由 `src/lib/reel/music.ts` 合成：96 BPM，一小節 2.5 秒。預覽頁按喇叭就能聽（跟輸出同一份），
調音效 cue 時不用每次都輸出 MP4。每支 reel 只提供：

- `drop`：鼓組全開的時間點。對到**揭曉答案那一刻**（範本是切到 subgrid 的 17.5 秒），
  而且要落在小節線上（2.5 的倍數），前一小節會自動漸強。
- `cues`：`whoosh`（換大標）、`bonk`（✗ 出現）、`chime`（✓ 出現，`note` 是 MIDI 音高，
  84／88 好聽）。秒數對齊畫面上那個元素「彈出來」的時間，不是它開始進場的時間。

`duration` 取 2.5 的倍數，最後一小節會自動收掉鼓組淡出，所以結尾畫面要在
`duration - 2.5` 之前完整出現。

## 驗

dev server 要開在 3210：沒跑就 `preview_start` 起 `.claude/launch.json` 的
`ig-post-studio`（已經在跑會回 port 被占用，直接用）。

1. `pnpm check` 過（oxfmt + oxlint + tsc）。
2. **每一幕截一張定格**，挑每一幕內容全部出現、還沒開始退場的那一秒：

   ```bash
   pnpm reel <id> --stills 2.8,6.5,11,15,19.5 --theme light
   ```

   會寫到 `renders/<id>-<theme>-stills/<秒>.png`，終端機會印出頁面錯誤。用 ffmpeg 併成一張
   方便一次看完（`hstack` 四張一排、`scale=1600:-1`），再用 Read 看圖。

3. 看圖檢查：
   - 沒有兩幕的東西同時留在畫面上（退場時間沒接好會殘留）
   - 大標 ≤ 2 行、沒有撞到示範區；副標單行
   - 對齊線、記號真的落在它標的東西上
   - y > 1550 沒有重點；右側 120px 沒有被按鈕蓋住會看不懂的字
4. 在 `/reel/<id>` 從頭播一次，看轉場節奏（定格看不出殘影與太快的地方）。

四項都過再 `pnpm reel <id>` 輸出。完整輸出 40 秒大約要 1 分鐘，所以不要拿它當驗證手段。
輸出後用 `ffprobe` 確認畫面與音軌長度都等於 `duration`。

輸出腳本用的是本機的 Google Chrome（`channel: "chrome"`）與 ffmpeg；兩個都要裝著。
