// 把一支 reel 輸出成 MP4：pnpm reel <id> [--theme dark|light] → renders/<id>-<theme>.mp4
// 只截幾張定格檢查版面：pnpm reel <id> --stills 2.8,15,39.5 → renders/<id>-<theme>-stills/*.png
// 沒給 --theme 就用 reel 定義裡的預設配色。
//
// 開著的 dev server 上打開 /reel/<id>?render，逐格 seek + 截圖，用 ffmpeg 壓成
// 1080×1920 / 30fps 的 H.264，同時把 src/lib/reel/music.ts 合成的配樂混進去。
// 截圖透過 Playwright 開一個 headless 的 Google Chrome（channel: "chrome"，用本機裝好的 Chrome、
// 不必另外下載瀏覽器），是全新的 profile，不會碰到平常用的瀏覽器資料。
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
// Node 24 會直接剝掉型別執行 .ts；配樂跟預覽頁用的是同一份合成程式
import { encodeWav, synthesizeMusic } from "../src/lib/reel/music.ts";

const FPS = 30;
const PORT = 3210;
const USAGE =
  "用法：pnpm reel <id> [--theme dark|light] [--stills 秒數,秒數…]，例如 pnpm reel css-subgrid --theme light";
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { theme: { type: "string" }, stills: { type: "string" } },
});
const [id] = positionals;
const stills = values.stills?.split(",").filter(Boolean).map(Number) ?? null;
if (!id || (values.theme && !["dark", "light"].includes(values.theme)) || stills?.length === 0) {
  console.error(USAGE);
  process.exit(1);
}

const query = new URLSearchParams({ render: "" });
if (values.theme) query.set("theme", values.theme);
const url = `http://localhost:${PORT}/reel/${encodeURIComponent(id)}?${query}`;
const outDir = path.resolve("renders");

try {
  await fetch(`http://localhost:${PORT}`);
} catch {
  console.error(`連不到 localhost:${PORT}，先開 dev server：pnpm dev -p ${PORT}`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
// 頁面上的錯誤直接印出來：build 裡 querySelector 找不到節點時，畫面只會停在全黑
page.on("pageerror", (error) => console.error(`頁面錯誤：${error.message}`));
const response = await page.goto(url);
if (!response?.ok()) {
  console.error(`找不到 reel「${id}」（${response?.status()}）`);
  await browser.close();
  process.exit(1);
}
// dev server 的 Next.js 指示器浮在左下角，不能跟著被截進影片
await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
await page.waitForFunction(() => window.reelRender !== undefined, null, { timeout: 60_000 });
const { duration, music, theme } = await page.evaluate(() => ({
  duration: window.reelRender.duration,
  music: window.reelRender.music,
  theme: window.reelRender.theme,
}));
const out = path.join(outDir, `${id}-${theme}.mp4`);
const wav = path.join(outDir, `${id}-${theme}.wav`);

await mkdir(outDir, { recursive: true });

if (stills) {
  const dir = path.join(outDir, `${id}-${theme}-stills`);
  await mkdir(dir, { recursive: true });
  for (const t of stills) {
    await page.evaluate((at) => window.reelRender.seek(at), t);
    await page.screenshot({ path: path.join(dir, `${t}.png`) });
  }
  await browser.close();
  console.log(`定格 → ${path.relative(process.cwd(), dir)}/（${stills.join("、")} 秒）`);
  process.exit(0);
}

await writeFile(wav, encodeWav(synthesizeMusic(duration, music)));

const ffmpeg = spawn(
  "ffmpeg",
  [
    ["-y", "-loglevel", "error"],
    ["-f", "image2pipe", "-framerate", String(FPS), "-i", "-"],
    ["-i", wav, "-c:a", "aac", "-b:a", "192k", "-shortest"],
    ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium"],
    ["-movflags", "+faststart", out],
  ].flat(),
  { stdio: ["pipe", "inherit", "inherit"] },
);
const done = new Promise((resolve, reject) => {
  ffmpeg.on("error", reject);
  ffmpeg.on("close", (code) =>
    code === 0 ? resolve() : reject(new Error(`ffmpeg 結束碼 ${code}`)),
  );
});

const total = Math.round(duration * FPS);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.reelRender.seek(t), i / FPS);
  const frame = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ffmpeg.stdin.write(frame)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  if (i % FPS === 0) process.stdout.write(`\r${i / FPS}s / ${duration}s`);
}
ffmpeg.stdin.end();
await done;
await browser.close();
await rm(wav);
console.log(`\r輸出完成 → ${path.relative(process.cwd(), out)}`);
