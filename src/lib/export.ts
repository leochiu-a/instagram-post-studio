import { saveAs } from "file-saver";
import { domToBlob } from "modern-screenshot";
import { CANVAS } from "./theme";

/**
 * scale 1 代表輸出就是 1080×1350 的原尺寸 —— 版型元件本來就以真實尺寸渲染，
 * 預覽的縮放是外層 transform 的事，不該影響匯出。
 */
const PNG_OPTIONS = {
  width: CANVAS.width,
  height: CANVAS.height,
  scale: 1,
  type: "image/png",
} as const;

/**
 * modern-screenshot 會等媒體載入完才畫（預設 30 秒 timeout），字體也是它自己
 * 內嵌的，所以不需要像 html-to-image 那樣先用低解析度空跑一輪暖機。
 */
const render = (node: HTMLElement) => domToBlob(node, PNG_OPTIONS);

export async function downloadSlide(node: HTMLElement, filename: string) {
  saveAs(await render(node), filename);
}

export async function downloadAllAsZip(
  nodes: HTMLElement[],
  baseName: string,
  onProgress?: (done: number, total: number) => void,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const [i, node] of nodes.entries()) {
    zip.file(`${String(i + 1).padStart(2, "0")}.png`, await render(node));
    onProgress?.(i + 1, nodes.length);
  }

  saveAs(await zip.generateAsync({ type: "blob" }), `${baseName}.zip`);
}

/** 檔名安全化：中文保留，只把路徑與特殊字元換掉。 */
export function safeFileName(input: string) {
  return (input.trim() || "ig-post").replaceAll(/[\\/:*?"<>|]+/g, "-").slice(0, 60);
}
