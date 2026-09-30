/**
 * 合成 reel 的 lo-fi 配樂（96 BPM、Fmaj7 → Em7 → Dm7 → Cmaj7）。
 *
 * 曲子的骨架每支 reel 都一樣，只有鼓組全開的時間點（drop）和音效 cue 由 reel 定義提供。
 * 預覽頁（瀏覽器，Web Audio 播放）與 scripts/render-reel.mjs（Node，寫成 WAV 混進 MP4）
 * 共用這一份，所以預覽聽到的就是輸出的那一份。只用標準 API、不依賴 DOM 或 Node。
 */
import type { ReelMusic } from "./types";

const SR = 44100;
const BPM = 96;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export interface ReelAudio {
  sampleRate: number;
  left: Float32Array<ArrayBuffer>;
  right: Float32Array<ArrayBuffer>;
}

/** 合成整支配樂：已經過 soft clip、正規化到 -1 dBFS、頭尾淡入淡出 */
export function synthesizeMusic(duration: number, { drop, cues }: ReelMusic): ReelAudio {
  const DUR = duration;
  const N = Math.round(SR * DUR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

  function add(t0: number, len: number, fn: (t: number) => number, gain = 1, pan = 0) {
    const s0 = Math.floor(t0 * SR),
      n = Math.floor(len * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4),
      gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < n && s0 + i < N; i++) {
      if (s0 + i < 0) continue;
      const v = fn(i / SR);
      L[s0 + i] += v * gl;
      R[s0 + i] += v * gr;
    }
  }

  // Fmaj7 - Em7 - Dm7 - Cmaj7
  const CHORDS = [
    [53, 57, 60, 64],
    [52, 55, 59, 62],
    [50, 53, 57, 60],
    [48, 52, 55, 59],
  ];

  /* ---- instruments ---- */
  function pad(t0: number, notes: number[], len: number) {
    notes.forEach((m, k) => {
      let lp = 0;
      add(
        t0,
        len + 0.6,
        (t) => {
          const env = Math.min(1, t / 0.5) * Math.min(1, Math.max(0, (len + 0.6 - t) / 0.6));
          const f = hz(m + 12);
          const x =
            Math.sin(2 * Math.PI * f * t) +
            0.5 * Math.sin(2 * Math.PI * f * 1.003 * t) +
            0.25 * Math.sin(4 * Math.PI * f * t);
          lp += 0.08 * (x - lp);
          return lp * env;
        },
        0.045,
        k % 2 ? 0.35 : -0.35,
      );
    });
  }
  function keys(t0: number, m: number, gain: number, pan: number) {
    const f = hz(m);
    add(
      t0,
      1.2,
      (t) => {
        const env = Math.exp(-t * 4.5) * Math.min(1, t / 0.004);
        const trem = 1 + 0.15 * Math.sin(2 * Math.PI * 5 * t);
        return (
          (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 8)) *
          env *
          trem
        );
      },
      gain,
      pan,
    );
  }
  function bass(t0: number, m: number, len: number) {
    const f = hz(m - 12);
    add(
      t0,
      len,
      (t) => {
        const env = Math.min(1, t / 0.01) * Math.exp(-t * 1.6) * Math.min(1, (len - t) / 0.05);
        return (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(4 * Math.PI * f * t)) * env;
      },
      0.32,
    );
  }
  function kick(t0: number, g = 0.75) {
    let ph = 0;
    add(
      t0,
      0.4,
      (t) => {
        const f = 45 + 90 * Math.exp(-t * 30);
        ph += (2 * Math.PI * f) / SR;
        return Math.sin(ph) * Math.exp(-t * 9);
      },
      g,
    );
  }
  function snare(t0: number, g = 0.22) {
    let lp = 0;
    add(
      t0,
      0.3,
      (t) => {
        const n = rand();
        lp += 0.25 * (n - lp);
        return (
          (n - lp) * Math.exp(-t * 16) + 0.4 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 25)
        );
      },
      g,
    );
  }
  function hat(t0: number, g = 0.07, open = false) {
    let prev = 0;
    add(
      t0,
      open ? 0.25 : 0.06,
      (t) => {
        const n = rand();
        const hp = n - prev;
        prev = n;
        return hp * Math.exp(-t * (open ? 14 : 70));
      },
      g,
      0.3,
    );
  }
  function whoosh(tCenter: number, len = 0.7, g = 0.2) {
    let lp = 0;
    add(
      tCenter - len * 0.6,
      len,
      (t) => {
        const p = t / len;
        const env = Math.sin(Math.PI * Math.min(1, p)) ** 2;
        lp += (0.02 + 0.12 * env) * (rand() - lp);
        return lp * env;
      },
      g,
      0,
    );
  }
  function chime(t0: number, m: number, g = 0.16) {
    const f = hz(m);
    add(
      t0,
      1.4,
      (t) =>
        (Math.sin(2 * Math.PI * f * t) +
          0.4 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 6)) *
        Math.exp(-t * 3.2) *
        Math.min(1, t / 0.003),
      g,
      0.2,
    );
  }
  function bonk(t0: number, g = 0.14) {
    add(t0, 0.25, (t) => Math.sin(2 * Math.PI * (330 - 500 * t) * t) * Math.exp(-t * 18), g, -0.2);
  }

  /* ---- 編曲 ---- */
  const bars = Math.ceil(DUR / BAR);
  const dropBar = Math.round(drop / BAR);
  for (let b = 0; b < bars; b++) {
    const t = b * BAR;
    const ch = CHORDS[b % 4];
    // 最後一小節收掉鼓組，只留鋪底與琶音淡出
    const outro = b === bars - 1;
    const full = b >= dropBar && !outro;

    pad(t, ch, BAR);

    // 慵懶的八分音符琶音，偶數拍稍微 swing
    if (b >= 1) {
      const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
      pattern.forEach((k, i) => {
        if (!full && i % 2 === 1 && i !== 3) return;
        const swing = i % 2 ? BEAT * 0.08 : 0;
        keys(t + (i * BEAT) / 2 + swing, ch[k] + 12, full ? 0.11 : 0.09, i % 2 ? 0.25 : -0.25);
      });
    }

    if (b >= 2 && !outro) {
      bass(t, ch[0], BEAT * 1.9);
      bass(t + BEAT * 2.5, ch[0] + (b % 2 ? 7 : 0), BEAT * 1.4);
      kick(t, full ? 0.75 : 0.5);
      kick(t + BEAT * 2.5, full ? 0.65 : 0.4);
      for (let i = 0; i < 8; i++) {
        const swing = i % 2 ? BEAT * 0.08 : 0;
        hat(t + (i * BEAT) / 2 + swing, i % 2 ? 0.05 : 0.08, full && i === 7);
      }
      if (full || b >= 3) {
        snare(t + BEAT, full ? 0.22 : 0.13);
        snare(t + BEAT * 3, full ? 0.22 : 0.13);
      }
    }
  }

  // drop 前的漸強
  let rlp = 0;
  add(
    drop - BAR,
    BAR,
    (t) => {
      const p = t / BAR;
      rlp += (0.01 + 0.15 * p) * (rand() - rlp);
      return rlp * p * p;
    },
    0.22,
  );
  kick(drop, 0.85);
  hat(drop, 0.12, true);

  for (const cue of cues) {
    if (cue.kind === "whoosh") whoosh(cue.at);
    if (cue.kind === "bonk") bonk(cue.at);
    if (cue.kind === "chime") chime(cue.at, cue.note ?? 84);
  }

  // 黑膠雜音
  for (let i = 0; i < DUR * 6.5; i++) {
    const t = Math.abs(rand()) * DUR;
    add(t, 0.004, (x) => rand() * Math.exp(-x * 900), 0.05 * Math.abs(rand()), rand() * 0.6);
  }

  /* ---- master：soft clip、正規化到 -1 dBFS、頭尾淡入淡出 ---- */
  let peak = 0;
  for (let i = 0; i < N; i++) {
    L[i] = Math.tanh(L[i] * 1.2);
    R[i] = Math.tanh(R[i] * 1.2);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.89 / peak;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const gain = norm * Math.min(1, t / 0.3) * Math.min(1, (DUR - t) / 2.5);
    L[i] *= gain;
    R[i] *= gain;
  }
  return { sampleRate: SR, left: L, right: R };
}

/** 包成 16-bit stereo PCM 的 WAV 檔 */
export function encodeWav({ sampleRate, left, right }: ReelAudio): Uint8Array {
  const n = left.length;
  const view = new DataView(new ArrayBuffer(44 + n * 4));
  const text = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + n * 4, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    view.setInt16(44 + i * 4, Math.round(left[i] * 32767), true);
    view.setInt16(46 + i * 4, Math.round(right[i] * 32767), true);
  }
  return new Uint8Array(view.buffer);
}
