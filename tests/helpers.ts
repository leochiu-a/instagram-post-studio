import { crc32 as zlibCrc32, deflateSync } from "node:zlib";
import type { Page } from "@playwright/test";
import { CANVAS } from "../src/lib/theme";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 匯出的 PNG 會被文字反鋸齒影響，比色留一點容差 */
export function isClose(actual: Rgb, expected: Rgb, tolerance = 12) {
  return actual.every((channel, i) => Math.abs(channel - expected[i]) <= tolerance);
}

export function pngSize(buffer: Buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * 在瀏覽器裡把匯出的 PNG 畫到 canvas 上取樣指定座標。
 * 座標就是畫布座標（1080×1350），不需要換算。
 */
export async function samplePixels(page: Page, png: Buffer, points: [number, number][]) {
  return page.evaluate(
    async ({ base64, points: pts }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("拿不到 canvas context");
      context.drawImage(image, 0, 0);
      return pts.map(([x, y]) => {
        const [r, g, b] = context.getImageData(x, y, 1, 1).data;
        return [r, g, b] as [number, number, number];
      });
    },
    { base64: png.toString("base64"), points },
  );
}

/** 量元素在畫布座標系裡的位置（預覽是縮放過的，這裡換算回 1080×1350） */
export async function canvasRect(page: Page, slideId: string, selector: string) {
  return page.evaluate(
    ({ id, sel, canvasWidth }) => {
      const card = document.querySelector<HTMLElement>(`[data-slide-id="${id}"]`);
      if (!card) throw new Error(`找不到頁面 ${id}`);
      const target = card.querySelector<HTMLElement>(sel);
      if (!target) return null;
      const cardBox = card.getBoundingClientRect();
      const scale = cardBox.width / canvasWidth;
      const box = target.getBoundingClientRect();
      return {
        left: (box.left - cardBox.left) / scale,
        top: (box.top - cardBox.top) / scale,
        width: box.width / scale,
        height: box.height / scale,
      };
    },
    { id: slideId, sel: selector, canvasWidth: CANVAS.width },
  );
}

/** PNG 的一個 chunk：長度 + 型別 + 資料 + 前三者算出來的 CRC */
function pngChunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlibCrc32(body), 0);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  return Buffer.concat([length, body, crc]);
}

/**
 * 產一張純色 PNG 的 buffer，給「上傳圖檔」的測試用。
 *
 * 上傳走的是真的 file input，需要真的檔案位元；用 data URL 的 SVG 沒辦法測到
 * Storage → 公開網址 → html-to-image 這條鏈。自己組 PNG 比塞一個 binary fixture
 * 進 repo 乾淨，也能隨時換顏色。
 */
export function solidPng(hex: string, size = 64) {
  const [r, g, b] = hexToRgb(hex);

  // 每條 scanline 前面要有一個 filter type byte（0 = None）
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    for (let x = 0; x < size; x++) {
      raw.set([r, g, b], rowStart + 1 + x * 3);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, truecolor RGB, 無交錯

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
