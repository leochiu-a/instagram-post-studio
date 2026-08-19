import { saveAs } from "file-saver";
import { toBlob } from "html-to-image";
import { CANVAS } from "./theme";

const PNG_OPTIONS = {
  width: CANVAS.width,
  height: CANVAS.height,
  pixelRatio: 1,
  cacheBust: true,
} as const;

async function render(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, PNG_OPTIONS);
  if (!blob) throw new Error("PNG 產生失敗");
  return blob;
}

/**
 * html-to-image 第一次呼叫時字體與圖片常常還沒進快取，
 * 匯出前先空跑一次，後續每張圖才會完整。
 */
export async function warmUp(node: HTMLElement) {
  await toBlob(node, { ...PNG_OPTIONS, pixelRatio: 0.1 }).catch(() => null);
}

export async function downloadSlide(node: HTMLElement, filename: string) {
  await warmUp(node);
  saveAs(await render(node), filename);
}

export async function downloadAllAsZip(
  nodes: HTMLElement[],
  baseName: string,
  onProgress?: (done: number, total: number) => void,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  if (nodes[0]) await warmUp(nodes[0]);
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

/** 本機圖檔轉 data URL —— 遠端圖片會因為 CORS 讓 canvas 匯出失敗。 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)), { once: true });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("讀取圖檔失敗")), {
      once: true,
    });
    reader.readAsDataURL(file);
  });
}
