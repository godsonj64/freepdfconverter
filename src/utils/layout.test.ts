import { describe, expect, it } from 'vitest';
import {
  canvasFitScale,
  CONTINUOUS_MIN_HEIGHT_MM,
  FOOTER_BAND_MM,
  isSupportedImage,
  layoutContinuous,
  layoutPaginated,
  MAX_CANVAS_AREA_IOS,
  normalizeRotation,
  qualityToFormat,
  rotatedSize,
  sanitizeFileName,
} from './layout';

describe('isSupportedImage', () => {
  it('accepts images by MIME type or by extension', () => {
    expect(isSupportedImage({ name: 'a.png', type: 'image/png' })).toBe(true);
    expect(isSupportedImage({ name: 'shot', type: 'image/webp' })).toBe(true);
    expect(isSupportedImage({ name: 'PHOTO.JPEG', type: '' })).toBe(true);
    expect(isSupportedImage({ name: 'logo.svg', type: '' })).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isSupportedImage({ name: 'notes.txt', type: 'text/plain' })).toBe(false);
    expect(isSupportedImage({ name: 'doc.pdf', type: 'application/pdf' })).toBe(false);
    expect(isSupportedImage({ name: 'png.exe', type: '' })).toBe(false);
  });
});

describe('rotation helpers', () => {
  it('normalizes any multiple of 90', () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(360)).toBe(0);
  });

  it('swaps width and height for quarter turns only', () => {
    expect(rotatedSize(800, 1600, 90)).toEqual({ width: 1600, height: 800 });
    expect(rotatedSize(800, 1600, 270)).toEqual({ width: 1600, height: 800 });
    expect(rotatedSize(800, 1600, 180)).toEqual({ width: 800, height: 1600 });
  });
});

describe('qualityToFormat', () => {
  it('keeps maximum lossless and compresses the rest as JPEG', () => {
    expect(qualityToFormat('maximum')).toMatchObject({ format: 'PNG' });
    expect(qualityToFormat('high')).toMatchObject({ format: 'JPEG', jpegQuality: 0.92 });
    expect(qualityToFormat('compressed')).toMatchObject({ format: 'JPEG', jpegQuality: 0.75 });
  });
});

describe('canvasFitScale', () => {
  it('leaves normal images alone', () => {
    expect(canvasFitScale(1200, 3000)).toBe(1);
  });

  it('shrinks past the side limit', () => {
    expect(canvasFitScale(1000, 65534)).toBeCloseTo(32767 / 65534);
  });

  it('shrinks past the area limit', () => {
    const scale = canvasFitScale(1200, 20000, 32767, MAX_CANVAS_AREA_IOS);
    expect(1200 * scale * 20000 * scale).toBeLessThanOrEqual(MAX_CANVAS_AREA_IOS + 1);
  });

  it('never divides by zero', () => {
    expect(canvasFitScale(0, 0)).toBe(1);
  });
});

describe('layoutContinuous', () => {
  const noExtras = { margin: 'none' as const, addTimestamp: false };

  it('stacks images edge to edge at full width', () => {
    const { pageWidth, pageHeight, placements } = layoutContinuous(
      [
        { width: 1000, height: 1000 },
        { width: 500, height: 1000 },
      ],
      noExtras
    );
    expect(pageWidth).toBe(210);
    expect(placements[0]).toEqual({ x: 0, y: 0, width: 210, height: 210 });
    expect(placements[1]).toEqual({ x: 0, y: 210, width: 210, height: 420 });
    expect(pageHeight).toBe(630);
  });

  it('applies margins on every side', () => {
    const { pageHeight, placements } = layoutContinuous([{ width: 1000, height: 2000 }], {
      margin: 'standard',
      addTimestamp: false,
    });
    expect(placements[0]).toEqual({ x: 12, y: 12, width: 186, height: 372 });
    expect(pageHeight).toBe(12 + 372 + 12);
  });

  it('reserves a band for the timestamp instead of printing over the image', () => {
    const plain = layoutContinuous([{ width: 1000, height: 2000 }], noExtras);
    const stamped = layoutContinuous([{ width: 1000, height: 2000 }], { margin: 'none', addTimestamp: true });
    expect(stamped.pageHeight).toBe(plain.pageHeight + FOOTER_BAND_MM);
  });

  it('keeps a minimum page height for wide strips', () => {
    expect(layoutContinuous([{ width: 4000, height: 100 }], noExtras).pageHeight).toBe(CONTINUOUS_MIN_HEIGHT_MM);
  });
});

describe('layoutPaginated', () => {
  it('uses A4 or US Letter page sizes', () => {
    const base = { margin: 'none' as const, showPageNumbers: false, addTimestamp: false };
    expect(layoutPaginated([], { ...base, layoutMode: 'paginated_a4' })).toMatchObject({ pageWidth: 210, pageHeight: 297 });
    expect(layoutPaginated([], { ...base, layoutMode: 'paginated_letter' })).toMatchObject({
      pageWidth: 215.9,
      pageHeight: 279.4,
    });
  });

  it('fits tall images to the page height and centres them', () => {
    const [p] = layoutPaginated([{ width: 1000, height: 4000 }], {
      layoutMode: 'paginated_a4',
      margin: 'none',
      showPageNumbers: false,
      addTimestamp: false,
    }).placements;
    expect(p.height).toBe(297);
    expect(p.width).toBeCloseTo(297 / 4);
    expect(p.x).toBeCloseTo((210 - 297 / 4) / 2);
  });

  it('keeps page numbers and the timestamp clear of the image', () => {
    const [p] = layoutPaginated([{ width: 1000, height: 4000 }], {
      layoutMode: 'paginated_a4',
      margin: 'none',
      showPageNumbers: true,
      addTimestamp: false,
    }).placements;
    expect(p.y + p.height).toBeLessThanOrEqual(297 - FOOTER_BAND_MM);
  });
});

describe('sanitizeFileName', () => {
  it('strips characters that are illegal in file names', () => {
    expect(sanitizeFileName('my/report?.pdf')).toBe('my-report');
    expect(sanitizeFileName('a:b*c')).toBe('a-b-c');
  });

  it('falls back when nothing usable is left', () => {
    expect(sanitizeFileName('   ')).toBe('freepdfconverter-document');
    expect(sanitizeFileName('...')).toBe('freepdfconverter-document');
  });

  it('keeps ordinary names as they are', () => {
    expect(sanitizeFileName('Invoice 2026 (final)')).toBe('Invoice 2026 (final)');
  });
});
