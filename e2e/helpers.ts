import { deflateSync } from 'node:zlib';
import { expect, Page } from '@playwright/test';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encodes an RGBA PNG from a per-pixel colour function. */
export function makePng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number]) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw.set([r, g, b, a], row + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function pngSize(buf: Buffer) {
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export const png = (name: string, width: number, height: number, pixel: Parameters<typeof makePng>[2]) => ({
  name,
  mimeType: 'image/png',
  buffer: makePng(width, height, pixel),
});

export const solid = (name: string, width: number, height: number, rgb: [number, number, number]) =>
  png(name, width, height, () => [...rgb, 255]);

/** Opaque red square in the middle, fully transparent everywhere else. */
export const transparent = (name = 'transparent.png') =>
  png(name, 200, 200, (x, y) => (x > 70 && x < 130 && y > 70 && y < 130 ? [255, 0, 0, 255] : [0, 0, 0, 0]));

/** Minimal PDF inspection: page count, page sizes (pt) and raw text. */
export function inspectPdf(buf: Buffer) {
  const text = buf.toString('latin1');
  expect(text.startsWith('%PDF-')).toBe(true);
  const pages = text.match(/\/Type\s*\/Page(?![s\w])/g) ?? [];
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*([\d.\s-]+)\]/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
  return { pageCount: pages.length, mediaBoxes: boxes, text };
}

export const MM_TO_PT = 72 / 25.4;

export async function addFiles(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.getByTestId('file-input').setInputFiles(files);
}

export async function queueNames(page: Page) {
  return page.getByTestId('queue-item').locator('span.truncate').allTextContents();
}

export async function download(page: Page, trigger: () => Promise<void>) {
  const [dl] = await Promise.all([page.waitForEvent('download'), trigger()]);
  const path = await dl.path();
  const fs = await import('node:fs');
  return { name: dl.suggestedFilename(), buffer: fs.readFileSync(path!) };
}
