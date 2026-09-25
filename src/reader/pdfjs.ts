import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// pdf_viewer.mjs reads the core library from this global while it is being
// evaluated, so this module must be imported before the viewer components.
(globalThis as unknown as { pdfjsLib?: typeof pdfjsLib }).pdfjsLib = pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/** Runtime resources served by the `pdfjs-assets` Vite plugin. */
export const PDFJS_RESOURCES = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  iccUrl: '/pdfjs/iccs/',
} as const;

export { pdfjsLib };
