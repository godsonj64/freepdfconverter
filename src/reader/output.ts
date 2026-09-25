import type { PDFDocumentProxy } from 'pdfjs-dist';
import { currentValue, formatValue, type FormField } from './forms';
import { pdfjsLib } from './pdfjs';
import { SimpleLinkService } from './viewer';

/** Raster resolution for printing non-XFA pages (XFA pages print as vector HTML). */
const PRINT_DPI = 150;

export function downloadBytes(data: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function baseName(fileName: string) {
  return fileName.replace(/\.pdf$/i, '') || 'document';
}

export async function extractText(doc: PDFDocumentProxy): Promise<string> {
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      text += item.str + (item.hasEOL ? '\n' : '');
    }
    pages.push(`── Page ${i} ──\n${text.trim()}`);
  }
  return pages.join('\n\n') + '\n';
}

export function exportFormData(
  doc: PDFDocumentProxy,
  fields: FormField[],
  source: { fileName: string; sha256: string | null; technology: string },
) {
  const payload = {
    source: { file: source.fileName, sha256: source.sha256, formTechnology: source.technology },
    exportedAt: new Date().toISOString(),
    fields: fields.map((field) => {
      const value = currentValue(doc, field);
      return {
        name: field.name,
        label: field.label,
        type: field.kind,
        page: field.page,
        value: formatValue(field, value),
        rawValue: value ?? null,
      };
    }),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Lays every page out in a hidden print container and opens the browser print
 * dialog. For dynamic XFA forms this is the practical way to produce a normal,
 * universally readable PDF ("Save as PDF"), with the text kept as vector text.
 */
export async function printDocument(
  doc: PDFDocumentProxy,
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
) {
  const container = document.createElement('div');
  container.id = 'reader-print-container';
  const pageStyle = document.createElement('style');
  const imageUrls: string[] = [];
  const cleanup = () => {
    document.body.classList.remove('reader-printing');
    container.remove();
    pageStyle.remove();
    imageUrls.forEach((url) => URL.revokeObjectURL(url));
    window.removeEventListener('afterprint', cleanup);
  };

  try {
    const first = (await doc.getPage(1)).getViewport({ scale: 1 });
    // Browsers only honour one @page size; like pdf.js, use the first page's.
    pageStyle.textContent = `@page { size: ${first.width}pt ${first.height}pt; margin: 0; }`;
    const linkService = new SimpleLinkService();
    const printStorage = doc.annotationStorage.print;

    for (let i = 1; i <= doc.numPages; i++) {
      if (signal.aborted) throw new DOMException('Printing cancelled', 'AbortError');
      const page = await doc.getPage(i);
      const size = page.getViewport({ scale: 1 });
      const sheet = document.createElement('div');
      sheet.className = 'reader-print-page';
      sheet.style.width = `${size.width}pt`;
      sheet.style.height = `${size.height}pt`;

      if (doc.isPureXfa) {
        const xfaHtml = await page.getXfa();
        const layer = document.createElement('div');
        if (xfaHtml) {
          pdfjsLib.XfaLayer.render({
            viewport: page.getViewport({ scale: pdfjsLib.PixelsPerInch.PDF_TO_CSS_UNITS, dontFlip: true }),
            div: layer,
            xfaHtml,
            annotationStorage: doc.annotationStorage,
            linkService,
            intent: 'print',
          });
        }
        sheet.append(layer);
      } else {
        const viewport = page.getViewport({ scale: PRINT_DPI / 72 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({
          canvas,
          viewport,
          intent: 'print',
          annotationMode: pdfjsLib.AnnotationMode.ENABLE_STORAGE,
          printAnnotationStorage: printStorage,
        }).promise;
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
        canvas.width = canvas.height = 0;
        const img = document.createElement('img');
        if (blob) {
          const url = URL.createObjectURL(blob);
          imageUrls.push(url);
          img.src = url;
          await img.decode().catch(() => undefined);
        }
        sheet.append(img);
      }
      container.append(sheet);
      onProgress(i, doc.numPages);
    }

    document.head.append(pageStyle);
    document.body.append(container);
    document.body.classList.add('reader-printing');
    window.addEventListener('afterprint', cleanup);
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
