/**
 * Pure layout helpers shared by the PDF engine and the UI. Nothing in here
 * touches the DOM, so it is covered by the unit tests in src/utils/layout.test.ts.
 */
import { ConversionSettings, MarginOption, QualityOption } from '../types';

export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
];

const SUPPORTED_EXTENSION = /\.(png|jpe?g|webp|gif|svg|bmp)$/i;

export function isSupportedImage(file: { name: string; type: string }): boolean {
  return SUPPORTED_MIME_TYPES.includes(file.type) || SUPPORTED_EXTENSION.test(file.name);
}

export function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

/** Width/height of an image once its rotation is applied. */
export function rotatedSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rot = normalizeRotation(rotation);
  return rot === 90 || rot === 270 ? { width: height, height: width } : { width, height };
}

export function marginToMm(margin: MarginOption): number {
  return margin === 'none' ? 0 : margin === 'compact' ? 5 : 12;
}

export function qualityToFormat(quality: QualityOption): { format: 'PNG' | 'JPEG'; mime: string; jpegQuality: number } {
  if (quality === 'maximum') return { format: 'PNG', mime: 'image/png', jpegQuality: 1 };
  return { format: 'JPEG', mime: 'image/jpeg', jpegQuality: quality === 'high' ? 0.92 : 0.75 };
}

/**
 * Browsers refuse (or silently blank) canvases past a size limit. Chrome and
 * Firefox cap a side at 32767px and the area around 268M pixels; iOS Safari
 * caps the area at 16.7M pixels.
 */
export const MAX_CANVAS_SIDE = 32767;
export const MAX_CANVAS_AREA_DESKTOP = 268_435_456;
export const MAX_CANVAS_AREA_IOS = 16_777_216;

export function maxCanvasArea(): number {
  if (typeof navigator === 'undefined') return MAX_CANVAS_AREA_DESKTOP;
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS ? MAX_CANVAS_AREA_IOS : MAX_CANVAS_AREA_DESKTOP;
}

/** Scale factor (<= 1) that brings a canvas inside the browser's size limits. */
export function canvasFitScale(
  width: number,
  height: number,
  maxSide = MAX_CANVAS_SIDE,
  maxArea = MAX_CANVAS_AREA_DESKTOP
): number {
  if (width <= 0 || height <= 0) return 1;
  const sideScale = Math.min(1, maxSide / width, maxSide / height);
  const areaScale = Math.min(1, Math.sqrt(maxArea / (width * height)));
  return Math.min(sideScale, areaScale);
}

export const CONTINUOUS_PAGE_WIDTH_MM = 210;
export const CONTINUOUS_MIN_HEIGHT_MM = 100;
export const FOOTER_BAND_MM = 8;

export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One tall page: every image at full usable width, stacked top to bottom. */
export function layoutContinuous(
  sizes: { width: number; height: number }[],
  settings: Pick<ConversionSettings, 'margin' | 'addTimestamp'>
): { pageWidth: number; pageHeight: number; placements: Placement[] } {
  const margin = marginToMm(settings.margin);
  const pageWidth = CONTINUOUS_PAGE_WIDTH_MM;
  const usableWidth = pageWidth - margin * 2;

  let y = margin;
  const placements = sizes.map(({ width, height }) => {
    const scaledHeight = (height * usableWidth) / width;
    const placement = { x: margin, y, width: usableWidth, height: scaledHeight };
    y += scaledHeight;
    return placement;
  });

  // Keep the timestamp in its own band instead of printing it over the last image.
  const footer = settings.addTimestamp ? FOOTER_BAND_MM : 0;
  const pageHeight = Math.max(y + margin + footer, CONTINUOUS_MIN_HEIGHT_MM);
  return { pageWidth, pageHeight, placements };
}

/** Standard pages: one image per page, scaled to fit and centred. */
export function layoutPaginated(
  sizes: { width: number; height: number }[],
  settings: Pick<ConversionSettings, 'layoutMode' | 'margin' | 'showPageNumbers' | 'addTimestamp'>
): { pageWidth: number; pageHeight: number; placements: Placement[] } {
  const isLetter = settings.layoutMode === 'paginated_letter';
  const pageWidth = isLetter ? 215.9 : 210;
  const pageHeight = isLetter ? 279.4 : 297;
  const margin = marginToMm(settings.margin);
  const footer = settings.showPageNumbers || settings.addTimestamp ? FOOTER_BAND_MM + 2 : 0;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2 - footer;

  const placements = sizes.map(({ width, height }) => {
    const ratio = width / height;
    let renderW = usableWidth;
    let renderH = usableWidth / ratio;
    if (renderH > usableHeight) {
      renderH = usableHeight;
      renderW = usableHeight * ratio;
    }
    return {
      x: margin + (usableWidth - renderW) / 2,
      y: margin + (usableHeight - renderH) / 2,
      width: renderW,
      height: renderH,
    };
  });

  return { pageWidth, pageHeight, placements };
}

/** Turns whatever the user typed into a safe download name, without extension. */
export function sanitizeFileName(name: string, fallback = 'freepdfconverter-document'): string {
  const cleaned = name
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120);
  return cleaned || fallback;
}
