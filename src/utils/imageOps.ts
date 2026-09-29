import { ImageItem } from '../types';
import { canvasFitScale, maxCanvasArea, MAX_CANVAS_SIDE, normalizeRotation, rotatedSize } from './layout';

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime = 'image/png', quality = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image is too large for this browser to export.'))),
      mime,
      quality
    );
  });
}

/** The format to re-encode an edited image in. Canvas can only write PNG, JPEG and WebP. */
export function editedImageMime(file: File): string {
  return ['image/jpeg', 'image/webp', 'image/png'].includes(file.type) ? file.type : 'image/png';
}

/**
 * Draws an item onto a canvas with its rotation applied, shrunk if needed to
 * stay inside the browser's canvas limits.
 */
export async function getProcessedCanvas(item: ImageItem): Promise<HTMLCanvasElement> {
  const img = await loadImage(item.previewUrl);
  // SVGs without width/height report 0 in some browsers; fall back to what we measured on import.
  const naturalW = img.naturalWidth || item.width || 1200;
  const naturalH = img.naturalHeight || item.height || 800;

  const rot = normalizeRotation(item.rotation);
  const scale = canvasFitScale(naturalW, naturalH, MAX_CANVAS_SIDE, maxCanvasArea());
  const drawW = Math.max(1, Math.round(naturalW * scale));
  const drawH = Math.max(1, Math.round(naturalH * scale));
  const out = rotatedSize(drawW, drawH, rot);

  const canvas = document.createElement('canvas');
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  return canvas;
}

/** A crop rectangle in percent (0-100) of the rotated image. */
export interface PercentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Bakes an item's rotation, and optionally a crop, into a new image file.
 * The result has rotation 0 and matches what the user saw on screen.
 */
export async function bakeItemEdit(
  item: ImageItem,
  crop?: PercentRect
): Promise<Pick<ImageItem, 'file' | 'previewUrl' | 'width' | 'height' | 'size' | 'rotation'>> {
  const source = await getProcessedCanvas(item);
  const rect = crop ?? { x: 0, y: 0, width: 100, height: 100 };
  const sx = Math.round((Math.max(0, rect.x) / 100) * source.width);
  const sy = Math.round((Math.max(0, rect.y) / 100) * source.height);
  const sw = Math.max(1, Math.min(source.width - sx, Math.round((rect.width / 100) * source.width)));
  const sh = Math.max(1, Math.min(source.height - sy, Math.round((rect.height / 100) * source.height)));

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

  const mime = editedImageMime(item.file);
  const blob = await canvasToBlob(out, mime, 0.95);
  return {
    file: new File([blob], item.file.name, { type: blob.type || mime }),
    previewUrl: URL.createObjectURL(blob),
    width: sw,
    height: sh,
    size: blob.size,
    rotation: 0,
  };
}

/**
 * Merges all images vertically into a single high-resolution stitched PNG image
 */
export async function generateStitchedPng(items: ImageItem[]): Promise<Blob> {
  if (items.length === 0) throw new Error('No images to stitch');

  const canvases: HTMLCanvasElement[] = [];
  for (const item of items) canvases.push(await getProcessedCanvas(item));

  const naturalWidth = Math.max(...canvases.map((c) => c.width));
  const naturalHeight = canvases.reduce((sum, c) => sum + (c.height * naturalWidth) / c.width, 0);
  // Long stitches easily pass the browser's canvas limit; scale the whole strip down to fit.
  const scale = canvasFitScale(naturalWidth, naturalHeight, MAX_CANVAS_SIDE, maxCanvasArea());
  const targetWidth = Math.max(1, Math.floor(naturalWidth * scale));

  const merged = document.createElement('canvas');
  merged.width = targetWidth;
  merged.height = Math.max(1, Math.floor(naturalHeight * scale));
  const ctx = merged.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  let y = 0;
  for (const c of canvases) {
    const h = (c.height * targetWidth) / c.width;
    ctx.drawImage(c, 0, y, targetWidth, h);
    y += h;
  }

  return canvasToBlob(merged, 'image/png');
}

/** Saves a blob through a temporary link. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
